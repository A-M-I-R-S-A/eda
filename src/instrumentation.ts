/**
 * Server startup hook.
 *
 * Next runs `register()` once per server process before the first request is
 * handled, which makes it the right place to fail fast on a misconfigured
 * deployment: better a process that refuses to start with a clear message than
 * one that serves a login page nobody can get through.
 *
 * The Edge runtime gets neither check — it has no filesystem, no TCP socket to
 * MariaDB, and only a subset of the environment.
 */

/**
 * MySQL errors that will never resolve on their own.
 *
 * The distinction matters. A refused connection usually means MariaDB is still
 * starting and the next request will succeed, so crashing would be wrong. Bad
 * credentials or a missing database are configuration mistakes: retrying
 * forever just serves error pages, which is how a wrong `DATABASE_URL` once
 * went unnoticed here for days while `/api/health` quietly reported 503.
 */
const FATAL_DB_CODES = new Set([
  "ER_ACCESS_DENIED_ERROR",
  "ER_DBACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_NOT_SUPPORTED_AUTH_MODE",
]);

function isFatalDbError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return typeof code === "string" && FATAL_DB_CODES.has(code);
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertEnvironment } = await import("@/lib/config/env");
  assertEnvironment();

  /**
   * Create the tables and seed on first boot, rather than on the first
   * request that happens to need them. A slow first page load is a poor way
   * to discover the database is unreachable, and doing it here means the
   * schema exists before any traffic arrives.
   */
  const { ensureSchema } = await import("@/lib/db/mysql");
  const { readDb, sweepEphemeral } = await import("@/lib/db/store");

  try {
    await ensureSchema();
    await readDb();
    await sweepEphemeral();
    console.info("[startup] database ready.");
  } catch (error) {
    if (isFatalDbError(error)) {
      const detail = (error as { sqlMessage?: string; message?: string });
      throw new Error(
        "Database credentials are wrong — refusing to start.\n" +
          `  ${detail.sqlMessage ?? detail.message ?? String(error)}\n` +
          "  Check DATABASE_URL in .env.production, and check whether the host's\n" +
          "  own environment-variable panel is setting a different value — a real\n" +
          "  environment variable overrides the file.",
      );
    }

    /**
     * Anything else is treated as transient. A database that is briefly
     * unreachable at boot — MariaDB starting a moment after the app — should
     * not put the process into a crash loop. The first request retries, and
     * `readDb()` surfaces a clear error if it is still down.
     */
    console.error("[startup] database is not reachable yet:", error);
  }
}
