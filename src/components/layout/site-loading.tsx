import { Skeleton, SkeletonText } from "@/components/ui/states";

/**
 * Loading skeleton for the public site.
 *
 * Lives here rather than as a `loading.tsx` on the `(site)` group, and is
 * mounted only by routes that cannot 404.
 *
 * A route-level `loading.tsx` creates a Suspense boundary, and Next flushes
 * the shell — committing HTTP 200 — before the page component runs. Any
 * `notFound()` after that can swap the body but not the status, so every
 * unknown URL answered 200 with a "page not found" document: a soft 404 that
 * Google indexes and reports as an error. Routes that resolve CMS slugs
 * therefore render without a boundary so their 404s stay real 404s.
 */
export function SiteLoading() {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری صفحه">
      <div className="border-b border-line bg-paper-2/40">
        <div className="container-x py-10">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="mt-8 h-10 w-full max-w-2xl" />
          <Skeleton className="mt-4 h-10 w-full max-w-md" />
          <div className="mt-7 max-w-xl">
            <SkeletonText lines={2} />
          </div>
        </div>
      </div>

      <div className="container-x section">
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 bg-white p-7">
              <Skeleton className="size-11" />
              <Skeleton className="h-5 w-2/5" />
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
