import Link from "next/link";
import type { Category } from "@/types";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { Icon } from "@/components/ui/icon";

/**
 * Category + search controls for the knowledge centre.
 *
 * Implemented as real links and a plain GET form: filtering works without
 * JavaScript, every filtered view has its own crawlable URL, and the back
 * button behaves the way visitors expect.
 */
export function ArticleFilterBar({
  /** Live category list from the CMS. */
  categories,
  activeCategory = "all",
  search = "",
}: {
  categories: Pick<Category, "slug" | "title">[];
  activeCategory?: string;
  search?: string;
}) {
  const buildHref = (category: string) =>
    category === "all"
      ? search
        ? `${ROUTES.articles}?q=${encodeURIComponent(search)}`
        : ROUTES.articles
      : `${ROUTES.articles}?category=${category}${
          search ? `&q=${encodeURIComponent(search)}` : ""
        }`;

  const chips = [{ slug: "all", title: "همه موضوعات" }, ...categories];

  return (
    <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <nav aria-label="فیلتر دسته‌بندی" className="min-w-0">
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {chips.map((chip) => {
            const active = chip.slug === activeCategory;
            return (
              <li key={chip.slug} className="shrink-0">
                <Link
                  href={buildHref(chip.slug)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-xs border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors duration-250",
                    active
                      ? "border-navy-900 bg-navy-900 text-white"
                      : "border-line-2 text-ink-2 hover:border-navy-400 hover:text-navy-900",
                  )}
                >
                  {chip.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form
        action={ROUTES.articles}
        method="get"
        role="search"
        className="flex w-full shrink-0 items-center gap-2 lg:w-auto"
      >
        {activeCategory !== "all" && (
          <input type="hidden" name="category" value={activeCategory} />
        )}

        <div className="relative flex-1 lg:w-72">
          <label htmlFor="article-search" className="sr-only">
            جست‌وجو در مقالات
          </label>
          <input
            id="article-search"
            type="search"
            name="q"
            defaultValue={search}
            placeholder="جست‌وجو در مقالات…"
            className="h-11 w-full rounded-sm border border-line-2 bg-white ps-4 pe-10 text-[0.875rem] transition-colors placeholder:text-muted-2/80 focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]"
          />
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-muted-2"
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-sm border border-line-2 px-4 text-[0.875rem] font-medium text-navy-800 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white"
        >
          جست‌وجو
        </button>
      </form>
    </div>
  );
}
