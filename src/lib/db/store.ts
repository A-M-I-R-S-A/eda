import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { buildSeedDatabase } from "@/data";
import { migrate } from "./migrate";
import {
  COLLECTION_TABLES,
  TABLE_FOR_COLLECTION,
  ensureSchema,
  getPool,
  isDatabaseConfigured,
} from "./mysql";
import { COLLECTION_KEYS, DB_VERSION, type Database } from "./schema";

/**
 * MariaDB persistence adapter.
 *
 * ── Shape ─────────────────────────────────────────────────────────────────
 * Every read in the application goes through `readDb()` and every write
 * through `mutate()`. The repositories above this file (`./index.ts`,
 * `./cms.ts`) work against a plain in-memory `Database` object, so this module
 * is responsible for three things: materialising that object out of SQL,
 * writing back only the rows a mutation actually changed, and keeping separate
 * Node processes from overwriting one another.
 *
 * ── Cross-process coherence ───────────────────────────────────────────────
 * `db_meta.revision` is bumped inside every write transaction. A cached
 * snapshot is only trusted while its revision still matches the database, so a
 * second process picks up the first one's edits on its next read. Writers take
 * `SELECT … FOR UPDATE` on that same row, which serialises mutations across
 * every process and container touching this database.
 *
 * ── Scaling boundary ──────────────────────────────────────────────────────
 * The snapshot is held in memory per process. That is the right trade for this
 * dataset — site content is read on every page render and measures in
 * hundreds of kilobytes — but it does mean the collections must stay bounded.
 * The append-only ones are capped where they are written (`MAX_AUDIT_ENTRIES`,
 * `MAX_SMS_LOG_ENTRIES`, `MAX_REVISIONS_PER_ENTITY` in `./schema`), and the
 * short-lived tables are swept by `sweepEphemeral()`.
 *
 * Enquiries and appointments are the collections that grow without a cap, one
 * row per real client contact. At a few thousand rows that is still far
 * cheaper to hold than to re-query on every render; if this practice ever
 * reaches the point where it is not, those two are what to move behind
 * paginated SQL first.
 */

/* -------------------------------------------------------------------------- */
/*  Cache                                                                     */
/* -------------------------------------------------------------------------- */

interface StoreCache {
  db: Database | null;
  revision: number;
  /** `collection → (id → serialised row)` as last seen in the database. */
  rows: Map<string, Map<string, string>>;
  settingsJson: string;
  /** Epoch ms of the last revision check, to avoid one query per repository call. */
  checkedAt: number;
  loading: Promise<Database> | null;
  writeQueue: Promise<unknown>;
}

const globalCache = globalThis as unknown as { __dadavarStore?: StoreCache };

const cache: StoreCache =
  globalCache.__dadavarStore ??
  (globalCache.__dadavarStore = {
    db: null,
    revision: -1,
    rows: new Map(),
    settingsJson: "",
    checkedAt: 0,
    loading: null,
    writeQueue: Promise.resolve(),
  });

/**
 * How long a snapshot is served without re-checking the revision.
 *
 * Writes made by *this* process update the cache synchronously, so this only
 * bounds how stale another process's edit can look — a second by default.
 */
const CACHE_MS = Number(process.env.DB_CACHE_MS || 1000);

/* -------------------------------------------------------------------------- */
/*  Row helpers                                                               */
/* -------------------------------------------------------------------------- */

interface StoredRow extends RowDataPacket {
  id: string;
  data: string;
}

interface MetaRow extends RowDataPacket {
  revision: number | string;
  schema_version: number;
  seeded: number;
}

function sqlTime(iso: string | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return valid.toISOString().slice(0, 23).replace("T", " ");
}

function updatedAtOf(entity: unknown): string {
  const record = entity as { updatedAt?: string; createdAt?: string; at?: string };
  return sqlTime(record?.updatedAt || record?.createdAt || record?.at);
}

/**
 * Every collection entity carries an `id`. Newsletter subscribers and audit
 * entries included — the seed and the repositories both guarantee it.
 */
function idOf(entity: unknown): string | null {
  const id = (entity as { id?: unknown })?.id;
  return typeof id === "string" && id.length > 0 && id.length <= 64 ? id : null;
}

/* -------------------------------------------------------------------------- */
/*  Load                                                                      */
/* -------------------------------------------------------------------------- */

async function readRevision(): Promise<{
  revision: number;
  schemaVersion: number;
  seeded: boolean;
}> {
  const [rows] = await getPool().query<MetaRow[]>(
    "SELECT revision, schema_version, seeded FROM db_meta WHERE id = 1",
  );
  const row = rows[0];
  return {
    revision: row ? Number(row.revision) : 0,
    schemaVersion: row ? Number(row.schema_version) : 0,
    seeded: Boolean(row?.seeded),
  };
}

/** Materialises the whole `Database` object out of SQL. */
async function loadSnapshot(): Promise<{ db: Database; revision: number }> {
  const pool = getPool();
  const { revision, schemaVersion, seeded } = await readRevision();

  if (!seeded) {
    // First boot against an empty database.
    await seedDatabase();
    return loadSnapshot();
  }

  const [settingsRows] = await pool.query<StoredRow[]>(
    "SELECT id, data FROM settings WHERE id = 'site'",
  );

  const collections = await Promise.all(
    COLLECTION_KEYS.map(async (key) => {
      const table = TABLE_FOR_COLLECTION[key];
      const [rows] = await pool.query<StoredRow[]>(
        `SELECT id, data FROM \`${table}\` ORDER BY updated_at ASC`,
      );
      return [key, rows] as const;
    }),
  );

  /**
   * The stored schema version, not the current one.
   *
   * `migrate()` decides which steps to run by comparing this against
   * `DB_VERSION`. Hardcoding the current version here — as an earlier revision
   * did — made every snapshot look already-migrated, so no migration ever ran
   * and a schema change would land against data still in the old shape.
   */
  const raw: Record<string, unknown> = { version: schemaVersion };
  const rowMaps = new Map<string, Map<string, string>>();

  for (const [key, rows] of collections) {
    const map = new Map<string, string>();
    const items: unknown[] = [];
    for (const row of rows) {
      map.set(row.id, row.data);
      try {
        items.push(JSON.parse(row.data));
      } catch {
        console.warn(`[db] skipping unparsable row ${key}/${row.id}`);
      }
    }
    rowMaps.set(key, map);
    raw[key] = items;
  }

  const settingsJson = settingsRows[0]?.data ?? "";
  if (settingsJson) {
    try {
      raw.settings = JSON.parse(settingsJson);
    } catch {
      console.warn("[db] settings row is unparsable; falling back to defaults.");
    }
  }

  /**
   * Migrate rather than re-seed. A schema bump means the shape moved on, not
   * that the administrator's content should be discarded.
   */
  const migrated = await migrate(raw);
  const db = migrated ?? (await buildSeedDatabase());

  cache.rows = rowMaps;
  cache.settingsJson = settingsJson;

  if (schemaVersion !== DB_VERSION) {
    console.info(`[db] migrating snapshot ${schemaVersion} → ${DB_VERSION}.`);
    const bumped = await persistMigration(db);
    return { db, revision: bumped };
  }

  return { db, revision };
}

/**
 * Writes a migrated snapshot back and records the new schema version.
 *
 * Runs inside the same write lock as any other mutation, so two processes
 * starting against an out-of-date database cannot both migrate it. Returns the
 * revision the caller should cache.
 */
async function persistMigration(db: Database): Promise<number> {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<MetaRow[]>(
      "SELECT revision, schema_version FROM db_meta WHERE id = 1 FOR UPDATE",
    );

    // Another process migrated while we waited for the lock.
    if (Number(rows[0]?.schema_version) === DB_VERSION) {
      await connection.rollback();
      return Number(rows[0]?.revision ?? 0);
    }

    await connection.query(
      "REPLACE INTO settings (id, data, updated_at) VALUES (?, ?, ?)",
      ["site", JSON.stringify(db.settings), updatedAtOf(db.settings)],
    );
    cache.settingsJson = JSON.stringify(db.settings);

    // A migration may backfill a collection that did not exist before.
    for (const key of COLLECTION_KEYS) {
      const items = (db[key] ?? []) as unknown[];
      const known = cache.rows.get(key) ?? new Map<string, string>();
      const missing = items.filter((item) => {
        const id = idOf(item);
        return id !== null && !known.has(id);
      });
      if (!missing.length) continue;

      await insertRows(connection, TABLE_FOR_COLLECTION[key], missing);
      for (const item of missing) {
        const id = idOf(item);
        if (id) known.set(id, JSON.stringify(item));
      }
      cache.rows.set(key, known);
    }

    await connection.query(
      "UPDATE db_meta SET revision = revision + 1, schema_version = ? WHERE id = 1",
      [DB_VERSION],
    );

    await connection.commit();
    return Number(rows[0]?.revision ?? 0) + 1;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  Seed / import                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Imports a snapshot from the previous file-backed store, when asked to.
 *
 * Explicitly opt-in via `DATA_IMPORT_FILE`. An earlier revision picked up
 * `.data/db.json` automatically whenever it happened to be present, which is
 * the wrong default: a leftover development snapshot in the deploy directory
 * would silently become the live database — reinstating the demo enquiries and
 * the seeded staff accounts that a clean install deliberately omits. Carrying
 * real content forward is a deliberate migration step, so it takes a
 * deliberate setting.
 */
async function readLegacySnapshot(): Promise<Database | null> {
  const path = process.env.DATA_IMPORT_FILE?.trim();
  if (!path) return null;

  try {
    const raw = await readFile(resolve(path), "utf8");
    const migrated = await migrate(JSON.parse(raw) as unknown);
    if (migrated) {
      console.info(`[db] importing snapshot from ${path}`);
      return migrated;
    }
    console.warn(`[db] snapshot at ${path} could not be migrated; seeding fresh.`);
  } catch (error) {
    // A named import file that cannot be read is an operator mistake worth
    // failing on, not something to quietly skip past.
    throw new Error(
      `DATA_IMPORT_FILE is set to "${path}" but it could not be read: ${
        (error as Error).message
      }`,
    );
  }

  return null;
}

/**
 * Populates an empty database.
 *
 * Guarded by the same row lock writers use, so two processes starting at once
 * cannot both seed.
 */
async function seedDatabase(): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<MetaRow[]>(
      "SELECT revision, seeded FROM db_meta WHERE id = 1 FOR UPDATE",
    );
    if (rows[0]?.seeded) {
      // Another process won the race and has already seeded.
      await connection.rollback();
      return;
    }

    const db = (await readLegacySnapshot()) ?? (await buildSeedDatabase());

    await connection.query("REPLACE INTO settings (id, data, updated_at) VALUES (?, ?, ?)", [
      "site",
      JSON.stringify(db.settings),
      updatedAtOf(db.settings),
    ]);

    for (const key of COLLECTION_KEYS) {
      const table = TABLE_FOR_COLLECTION[key];
      const items = (db[key] ?? []) as unknown[];
      await insertRows(connection, table, items);
    }

    await connection.query(
      "UPDATE db_meta SET revision = revision + 1, schema_version = ?, seeded = 1 WHERE id = 1",
      [DB_VERSION],
    );

    await connection.commit();
    console.info("[db] database initialised.");
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

/** Batched multi-row insert; chunked so a large seed cannot exceed max_allowed_packet. */
async function insertRows(
  connection: PoolConnection,
  table: string,
  items: unknown[],
): Promise<void> {
  const CHUNK = 200;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (const item of chunk) {
      const id = idOf(item);
      if (!id) continue;
      placeholders.push("(?, ?, ?)");
      values.push(id, JSON.stringify(item), updatedAtOf(item));
    }

    if (!placeholders.length) continue;
    await connection.query(
      `REPLACE INTO \`${table}\` (id, data, updated_at) VALUES ${placeholders.join(", ")}`,
      values,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Read                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * True while `next build` is running.
 *
 * Next evaluates `generateMetadata` and `generateStaticParams` during the
 * build to decide what can be prerendered, and the root layout's metadata
 * reads site settings. On a host that builds and runs in separate steps — the
 * common case — the production database is not reachable from the build, and
 * an unguarded query there fails the deploy with a bare `ECONNREFUSED`.
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * A throwaway snapshot used only to let the build finish.
 *
 * Never persisted and never served: every public route is dynamic (the site
 * layout reads a cookie), so nothing rendered from this ends up baked into the
 * output. It exists so `next build` does not require database connectivity.
 */
let warnedBuildFallback = false;

async function buildPhaseFallback(): Promise<Database> {
  // Once per process, not once per page — `next build` renders dozens of
  // routes across several workers, and repeating this drowns the build output.
  if (!warnedBuildFallback) {
    warnedBuildFallback = true;
    console.warn(
      "[build] database unreachable; rendering build-time metadata from seed defaults. " +
        "Runtime still requires a working database.",
    );
  }
  return buildSeedDatabase({ ephemeral: true });
}

/** Returns the in-memory database, reloading when another process has written. */
export async function readDb(): Promise<Database> {
  if (!isDatabaseConfigured()) {
    if (isBuildPhase()) return buildPhaseFallback();
    throw new Error(
      "No database configured. Set DATABASE_URL (or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD) before starting the application.",
    );
  }

  try {
    await ensureSchema();
  } catch (error) {
    if (isBuildPhase()) return buildPhaseFallback();
    throw error;
  }

  if (cache.db) {
    const now = Date.now();
    if (now - cache.checkedAt < CACHE_MS) return cache.db;

    const { revision } = await readRevision();
    cache.checkedAt = now;
    if (revision === cache.revision) return cache.db;
  }

  if (!cache.loading) {
    cache.loading = loadSnapshot()
      .then(({ db, revision }) => {
        cache.db = db;
        cache.revision = revision;
        cache.checkedAt = Date.now();
        cache.loading = null;
        return db;
      })
      .catch((error) => {
        cache.loading = null;
        if (isBuildPhase()) return buildPhaseFallback();
        throw error;
      });
  }

  return cache.loading;
}

/* -------------------------------------------------------------------------- */
/*  Write                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Applies a mutation and persists only what changed.
 *
 * The callback receives a snapshot that is guaranteed fresh: the transaction
 * takes the meta-row lock first, so a concurrent writer in another process has
 * either already committed (and is visible here) or is waiting behind us.
 */
export async function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    await ensureSchema();
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      // Global write lock. Also tells us whether our snapshot is still current.
      const [metaRows] = await connection.query<MetaRow[]>(
        "SELECT revision, seeded FROM db_meta WHERE id = 1 FOR UPDATE",
      );
      const currentRevision = Number(metaRows[0]?.revision ?? 0);

      if (!cache.db || cache.revision !== currentRevision) {
        await connection.rollback();
        connection.release();
        // Reload outside the lock, then retry against the fresh snapshot.
        cache.db = null;
        cache.checkedAt = 0;
        await readDb();
        return run();
      }

      const db = cache.db;
      const result = await fn(db);

      const touched = await writeChanges(connection, db);

      if (touched > 0) {
        await connection.query(
          "UPDATE db_meta SET revision = revision + 1 WHERE id = 1",
        );
      }

      await connection.commit();

      cache.revision = touched > 0 ? currentRevision + 1 : currentRevision;
      cache.checkedAt = Date.now();

      return result;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      /**
       * The callback mutates the snapshot in place, so a failure part-way
       * through leaves memory disagreeing with the database. Drop it; the next
       * read rebuilds from the committed state.
       */
      cache.db = null;
      cache.revision = -1;
      cache.checkedAt = 0;
      throw error;
    } finally {
      connection.release();
    }
  };

  const queued = cache.writeQueue.then(run, run);
  cache.writeQueue = queued.catch(() => undefined);
  return queued;
}

/**
 * Diffs the mutated snapshot against the rows last read and writes the delta.
 *
 * Serialising the snapshot costs about a millisecond at this size and removes
 * an entire class of bug: no repository function has to remember to declare
 * what it touched.
 */
async function writeChanges(
  connection: PoolConnection,
  db: Database,
): Promise<number> {
  let touched = 0;

  const settingsJson = JSON.stringify(db.settings);
  if (settingsJson !== cache.settingsJson) {
    await connection.query(
      "REPLACE INTO settings (id, data, updated_at) VALUES (?, ?, ?)",
      ["site", settingsJson, updatedAtOf(db.settings)],
    );
    cache.settingsJson = settingsJson;
    touched += 1;
  }

  for (const key of COLLECTION_KEYS) {
    const table = TABLE_FOR_COLLECTION[key];
    const previous = cache.rows.get(key) ?? new Map<string, string>();
    const next = new Map<string, string>();
    const items = (db[key] ?? []) as unknown[];

    for (const item of items) {
      const id = idOf(item);
      if (!id) continue;

      const json = JSON.stringify(item);
      next.set(id, json);

      if (previous.get(id) !== json) {
        await connection.query(
          `REPLACE INTO \`${table}\` (id, data, updated_at) VALUES (?, ?, ?)`,
          [id, json, updatedAtOf(item)],
        );
        touched += 1;
      }
    }

    const removed = [...previous.keys()].filter((id) => !next.has(id));
    for (let i = 0; i < removed.length; i += 500) {
      const chunk = removed.slice(i, i + 500);
      await connection.query(
        `DELETE FROM \`${table}\` WHERE id IN (${chunk.map(() => "?").join(", ")})`,
        chunk,
      );
      touched += chunk.length;
    }

    cache.rows.set(key, next);
  }

  return touched;
}

/* -------------------------------------------------------------------------- */
/*  Maintenance                                                               */
/* -------------------------------------------------------------------------- */

/** Test/maintenance helper: drop the cached snapshot so the next read reloads. */
export function invalidateCache(): void {
  cache.db = null;
  cache.revision = -1;
  cache.checkedAt = 0;
  cache.loading = null;
  cache.rows = new Map();
  cache.settingsJson = "";
}

/** Removes expired one-time codes and stale rate-limit buckets. */
export async function sweepEphemeral(): Promise<void> {
  await ensureSchema();
  const pool = getPool();
  await pool.query("DELETE FROM otp_codes WHERE expires_at < UTC_TIMESTAMP(3)");
  await pool.query(
    "DELETE FROM rate_limits WHERE window_start < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)",
  );
}

/** True when the tables exist and answer a query — used by the health check. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await ensureSchema();
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export { COLLECTION_TABLES };
