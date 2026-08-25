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
    /**
     * Deliberately not fatal.
     *
     * A database that is briefly unreachable at boot — a container starting
     * a moment before MariaDB accepts connections — should not put the
     * application into a crash loop. The first request retries, and
     * `readDb()` throws a clear error if it is still down.
     */
    console.error("[startup] database is not reachable yet:", error);
  }
}
