import "server-only";

/**
 * Build-time parameter collection that tolerates an unreachable database.
 *
 * `generateStaticParams` runs during `next build`, which on most hosts is a
 * separate step from `next start` — often a different container, sometimes a
 * different machine, frequently without the production database reachable.
 * An unguarded query there turns a routine deploy into a failed build with a
 * `ECONNREFUSED` stack trace and no obvious connection to the cause.
 *
 * Returning an empty list is safe here. Every public route is dynamic anyway
 * (the site layout reads a cookie for the CSRF token), so these lists are a
 * prerender hint rather than the set of pages that exist: `dynamicParams`
 * stays on, and any slug still resolves on first request.
 */
export async function safeStaticParams<T>(
  load: () => Promise<T[]>,
  label: string,
): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.warn(
      `[build] could not read ${label} for prerendering; routes will resolve on request.`,
      (error as Error)?.message ?? error,
    );
    return [];
  }
}
