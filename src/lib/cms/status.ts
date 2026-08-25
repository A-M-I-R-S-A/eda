import type { ContentStatus, Publishable } from "@/types";

/**
 * Publication state, resolved at read time.
 *
 * Nothing schedules a job to flip `scheduled` into `published`. Liveness is a
 * pure function of the record and the clock, which is the only version that
 * stays correct on a serverless host, across restarts and inside a static
 * build. The admin still shows the stored status so an editor sees what they
 * chose, not what the clock happens to say.
 */

export function isLive(entity: Partial<Publishable> | null | undefined): boolean {
  if (!entity) return false;

  switch (entity.status) {
    case "published":
      return true;
    case "scheduled":
      return Boolean(
        entity.scheduledFor && new Date(entity.scheduledFor).getTime() <= Date.now(),
      );
    default:
      return false;
  }
}

/** A scheduled record whose moment has not arrived yet. */
export function isPending(entity: Partial<Publishable> | null | undefined): boolean {
  return entity?.status === "scheduled" && !isLive(entity);
}

/**
 * The status an entity should carry after an edit.
 *
 * Keeps `publishedAt` honest: it records the first time the record went live
 * and is never rewritten by a later edit, because that is the date readers and
 * search engines were shown.
 */
export function resolvePublication(
  next: { status: ContentStatus; scheduledFor?: string },
  current?: Partial<Publishable>,
): Pick<Publishable, "status" | "publishedAt" | "scheduledFor"> {
  const scheduledFor =
    next.status === "scheduled" ? next.scheduledFor || undefined : undefined;

  const goesLive = isLive({ status: next.status, scheduledFor });

  return {
    status: next.status,
    scheduledFor,
    publishedAt:
      current?.publishedAt ?? (goesLive ? new Date().toISOString() : undefined),
  };
}

/** Sorts newest-live-first, with drafts and archives after everything live. */
export function byPublicationRecency<T extends Partial<Publishable> & { updatedAt: string }>(
  a: T,
  b: T,
): number {
  const rank = (item: T) => (isLive(item) ? 0 : item.status === "archived" ? 2 : 1);
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;

  const at = (item: T) => new Date(item.publishedAt ?? item.updatedAt).getTime();
  return at(b) - at(a);
}

export const CONTENT_STATUSES: ContentStatus[] = [
  "draft",
  "published",
  "scheduled",
  "archived",
];
