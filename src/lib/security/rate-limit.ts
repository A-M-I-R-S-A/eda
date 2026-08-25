import "server-only";

import { headers } from "next/headers";
import type { RowDataPacket } from "mysql2/promise";
import { ensureSchema, getPool, isDatabaseConfigured } from "@/lib/db/mysql";

/**
 * Shared, fixed-window rate limiter.
 *
 * ── Why the database ──────────────────────────────────────────────────────
 * The counters used to live in a per-process `Map`, which quietly turned
 * "5 login attempts per 10 minutes" into 5 *per Node process*. Keeping them in
 * MariaDB means the limit is the limit however many processes are serving.
 *
 * ── Fixed rather than sliding window ──────────────────────────────────────
 * A sliding window needs every hit timestamp; a fixed window needs one counter
 * and one timestamp, which is a single upsert. The trade is that a burst
 * straddling a window boundary can briefly reach 2× the limit. For blunting
 * form spam and credential stuffing that is an acceptable difference, and the
 * cost is one indexed write instead of a growing array per key.
 *
 * ── Degradation ───────────────────────────────────────────────────────────
 * If the database cannot be reached the in-process fallback takes over. A
 * weaker limit is better than an outage that lets every request through
 * unchecked, or one that refuses them all.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the caller may retry. */
  retryAfter: number;
}

/* -------------------------------------------------------------------------- */
/*  In-process fallback                                                       */
/* -------------------------------------------------------------------------- */

interface Bucket {
  hits: number[];
}

const globalBuckets = globalThis as unknown as {
  __dadavarRateBuckets?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> =
  globalBuckets.__dadavarRateBuckets ??
  (globalBuckets.__dadavarRateBuckets = new Map());

function sweep(now: number, windowMs: number): void {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.every((t) => now - t > windowMs)) buckets.delete(key);
  }
}

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfter: 0 };
}

/* -------------------------------------------------------------------------- */
/*  Shared limiter                                                            */
/* -------------------------------------------------------------------------- */

interface CounterRow extends RowDataPacket {
  hits: number;
  elapsed: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!isDatabaseConfigured()) return memoryLimit(key, limit, windowMs);

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  // The column is 190 chars so it fits in an InnoDB utf8mb4 index.
  const bucket = key.slice(0, 190);

  try {
    await ensureSchema();
    const pool = getPool();

    /**
     * One statement does both jobs: start a new window if the old one has
     * expired, otherwise increment inside it.
     */
    await pool.query(
      `INSERT INTO rate_limits (bucket, hits, window_start)
            VALUES (?, 1, UTC_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE
            hits = IF(window_start <= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? SECOND), 1, hits + 1),
            window_start = IF(window_start <= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? SECOND), UTC_TIMESTAMP(3), window_start)`,
      [bucket, windowSeconds, windowSeconds],
    );

    const [rows] = await pool.query<CounterRow[]>(
      `SELECT hits, TIMESTAMPDIFF(SECOND, window_start, UTC_TIMESTAMP(3)) AS elapsed
         FROM rate_limits WHERE bucket = ?`,
      [bucket],
    );

    const row = rows[0];
    if (!row) return { allowed: true, remaining: limit - 1, retryAfter: 0 };

    const hits = Number(row.hits);
    const elapsed = Number(row.elapsed);

    if (hits > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, windowSeconds - elapsed),
      };
    }

    return { allowed: true, remaining: Math.max(0, limit - hits), retryAfter: 0 };
  } catch (error) {
    console.warn("[rate-limit] database unavailable; using in-process counters.", error);
    return memoryLimit(key, limit, windowMs);
  }
}

/* -------------------------------------------------------------------------- */
/*  Request helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Best-effort client IP.
 *
 * `x-forwarded-for` is only trustworthy behind a proxy that overwrites it. Set
 * `TRUST_PROXY_HOPS` to the number of proxies in front of the app so the
 * client-supplied prefix of the header is ignored; the default of 1 matches a
 * single reverse proxy, which is the usual deployment.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const hops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS || 1));
    const chain = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    // The right-most entries are the ones our own proxies appended.
    const trusted = chain[Math.max(0, chain.length - hops)];
    if (trusted) return trusted;
  }

  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
}

/** Convenience wrapper keyed by `scope:ip`. */
export async function limitByIp(
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const ip = await getClientIp();
  return rateLimit(`${scope}:${ip}`, limit, windowMs);
}

/** Persian message for a throttled request. */
export function rateLimitMessage(retryAfter: number): string {
  const minutes = Math.ceil(retryAfter / 60);
  return minutes > 1
    ? `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً پس از حدود ${minutes} دقیقه دوباره تلاش کنید.`
    : "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.";
}

/** Shared policy constants so limits are declared in one place. */
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 10 * 60 * 1000 },
  consultation: { limit: 5, windowMs: 60 * 60 * 1000 },
  appointment: { limit: 6, windowMs: 60 * 60 * 1000 },
  contact: { limit: 5, windowMs: 60 * 60 * 1000 },
  newsletter: { limit: 5, windowMs: 60 * 60 * 1000 },
  tracking: { limit: 20, windowMs: 15 * 60 * 1000 },
  upload: { limit: 15, windowMs: 60 * 60 * 1000 },
  /** Codes cost money and reach a real handset — kept deliberately tight. */
  otpSend: { limit: 3, windowMs: 10 * 60 * 1000 },
  otpVerify: { limit: 10, windowMs: 10 * 60 * 1000 },
  /** Staff-initiated messages: generous, but not unbounded. */
  smsSend: { limit: 40, windowMs: 60 * 60 * 1000 },
} as const;
