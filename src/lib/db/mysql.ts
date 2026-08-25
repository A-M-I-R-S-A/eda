import "server-only";

import mysql from "mysql2/promise";

/**
 * MariaDB connection pool and schema bootstrap.
 *
 * ── Connection ────────────────────────────────────────────────────────────
 * Configured either by a single `DATABASE_URL`
 * (`mysql://user:pass@host:3306/dbname`) or by the discrete `DB_*` variables.
 * The URL wins when both are present.
 *
 * ── Why one pool per process ──────────────────────────────────────────────
 * Next.js re-evaluates modules on hot-reload in development, which would leak
 * a pool per edit. The pool is therefore parked on `globalThis`, the same way
 * the snapshot cache is.
 */

const globalPool = globalThis as unknown as { __dadavarPool?: mysql.Pool };

/** Charset must be utf8mb4 — Persian content and emoji both need 4 bytes. */
const CHARSET = "utf8mb4";

function poolOptions(): mysql.PoolOptions {
  const url = process.env.DATABASE_URL;

  const base: mysql.PoolOptions = {
    charset: CHARSET,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    maxIdle: Number(process.env.DB_POOL_SIZE || 10),
    idleTimeout: 60_000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    // Dates and decimals come back as strings; every value we store is JSON
    // text, so no driver-side coercion should touch it.
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: "Z",
  };

  if (url) {
    const parsed = new URL(url);
    return {
      ...base,
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
      ...(parsed.searchParams.get("ssl") === "true"
        ? { ssl: { rejectUnauthorized: true } }
        : {}),
    };
  }

  return {
    ...base,
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "dadavar",
    ...(process.env.DB_SSL === "true"
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  };
}

/** True when the deployment has been given database credentials at all. */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_NAME),
  );
}

export function getPool(): mysql.Pool {
  if (globalPool.__dadavarPool) return globalPool.__dadavarPool;
  globalPool.__dadavarPool = mysql.createPool(poolOptions());
  return globalPool.__dadavarPool;
}

/* -------------------------------------------------------------------------- */
/*  Schema                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Collections are stored one table per collection, each row holding the entity
 * as JSON text under its primary key.
 *
 * The alternative — a fully normalised column-per-field schema — would mean
 * rewriting the ~120 repository functions in `./index.ts` and `./cms.ts` and
 * re-deriving every query, for a dataset whose largest table will hold a few
 * thousand rows. What this shape buys instead is what the file store could not
 * give: durability across deploys, per-row writes rather than rewriting the
 * whole dataset on every change, a global write lock so two processes cannot
 * lose each other's edits, and `mysqldump` backups.
 *
 * `updated_at` is a real column (not just a JSON field) so ordering and
 * retention sweeps can be done in SQL without parsing every row.
 */
export const COLLECTION_TABLES = [
  "users",
  "pages",
  "media",
  "services",
  "arbitrators",
  "articles",
  "categories",
  "testimonials",
  "faqs",
  "requests",
  "appointments",
  "messages",
  "newsletter",
  "revisions",
  "audit_log",
  "sms_log",
] as const;

export type CollectionTable = (typeof COLLECTION_TABLES)[number];

/**
 * Maps the in-memory `Database` keys to their table names.
 * Only `auditLog` and `smsLog` differ, because SQL identifiers are snake_case.
 */
export const TABLE_FOR_COLLECTION: Record<string, CollectionTable> = {
  users: "users",
  pages: "pages",
  media: "media",
  services: "services",
  arbitrators: "arbitrators",
  articles: "articles",
  categories: "categories",
  testimonials: "testimonials",
  faqs: "faqs",
  requests: "requests",
  appointments: "appointments",
  messages: "messages",
  newsletter: "newsletter",
  revisions: "revisions",
  auditLog: "audit_log",
  smsLog: "sms_log",
};

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS db_meta (
     id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
     revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
     schema_version INT NOT NULL DEFAULT 0,
     seeded TINYINT(1) NOT NULL DEFAULT 0
   ) ENGINE=InnoDB DEFAULT CHARSET=${CHARSET}`,

  `CREATE TABLE IF NOT EXISTS settings (
     id VARCHAR(16) NOT NULL PRIMARY KEY,
     data LONGTEXT NOT NULL,
     updated_at DATETIME(3) NOT NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=${CHARSET}`,

  ...COLLECTION_TABLES.map(
    (table) => `CREATE TABLE IF NOT EXISTS \`${table}\` (
       id VARCHAR(64) NOT NULL PRIMARY KEY,
       data LONGTEXT NOT NULL,
       updated_at DATETIME(3) NOT NULL,
       INDEX idx_${table}_updated (updated_at)
     ) ENGINE=InnoDB DEFAULT CHARSET=${CHARSET}`,
  ),

  /**
   * One-time phone-verification codes.
   *
   * A real table rather than a JSON collection: rows are short-lived, written
   * on every send and swept constantly, so they have no business being part of
   * the cached snapshot. The code is stored hashed — a leaked database backup
   * must not hand over live OTPs.
   */
  `CREATE TABLE IF NOT EXISTS otp_codes (
     id VARCHAR(64) NOT NULL PRIMARY KEY,
     phone VARCHAR(16) NOT NULL,
     purpose VARCHAR(32) NOT NULL,
     code_hash CHAR(64) NOT NULL,
     attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
     consumed TINYINT(1) NOT NULL DEFAULT 0,
     expires_at DATETIME(3) NOT NULL,
     created_at DATETIME(3) NOT NULL,
     INDEX idx_otp_lookup (phone, purpose, consumed),
     INDEX idx_otp_expiry (expires_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=${CHARSET}`,

  /**
   * Rate-limit counters.
   *
   * Replaces the per-process Map so the limits still hold when the site runs
   * more than one Node process — otherwise "5 login attempts per 10 minutes"
   * quietly becomes 5 per process.
   */
  `CREATE TABLE IF NOT EXISTS rate_limits (
     bucket VARCHAR(190) NOT NULL PRIMARY KEY,
     hits INT UNSIGNED NOT NULL DEFAULT 0,
     window_start DATETIME(3) NOT NULL,
     INDEX idx_rate_window (window_start)
   ) ENGINE=InnoDB DEFAULT CHARSET=${CHARSET}`,
];

const globalReady = globalThis as unknown as { __dadavarSchemaReady?: Promise<void> };

/** Creates every table if absent. Runs at most once per process. */
export function ensureSchema(): Promise<void> {
  if (globalReady.__dadavarSchemaReady) return globalReady.__dadavarSchemaReady;

  globalReady.__dadavarSchemaReady = (async () => {
    const pool = getPool();
    for (const statement of DDL) {
      await pool.query(statement);
    }
    await pool.query(
      "INSERT IGNORE INTO db_meta (id, revision, schema_version, seeded) VALUES (1, 0, 0, 0)",
    );
  })().catch((error) => {
    // Let the next call retry rather than caching a permanent failure.
    globalReady.__dadavarSchemaReady = undefined;
    throw error;
  });

  return globalReady.__dadavarSchemaReady;
}
