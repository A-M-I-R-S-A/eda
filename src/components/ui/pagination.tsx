import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { Icon } from "./icon";

/**
 * Pagination.
 *
 * Renders real `<a>` elements so pages are crawlable and work without JS.
 * In RTL, "next" points left — hence `chevron-start` on the next control.
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  const arrow = (
    target: number,
    direction: "prev" | "next",
    label: string,
  ) => {
    const disabled = direction === "prev" ? page <= 1 : page >= totalPages;
    const icon = direction === "prev" ? "chevron-end" : "chevron-start";

    if (disabled) {
      return (
        <span
          aria-disabled="true"
          className="flex size-10 items-center justify-center rounded-sm border border-line text-muted-2/50"
        >
          <Icon name={icon} size={17} />
        </span>
      );
    }

    return (
      <Link
        href={hrefFor(target)}
        aria-label={label}
        rel={direction === "prev" ? "prev" : "next"}
        className="flex size-10 items-center justify-center rounded-sm border border-line-2 text-navy-800 transition-colors duration-200 hover:border-navy-900 hover:bg-navy-900 hover:text-white"
      >
        <Icon name={icon} size={17} />
      </Link>
    );
  };

  return (
    <nav aria-label="صفحه‌بندی" className={cn("flex items-center justify-center gap-2", className)}>
      {arrow(page - 1, "prev", "صفحه قبل")}

      <ul className="flex items-center gap-1.5">
        {pages.map((item, index) =>
          item === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-muted-2 select-none"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "flex size-10 items-center justify-center rounded-sm border text-[0.875rem] font-medium tabular-nums transition-colors duration-200",
                  item === page
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-line-2 text-navy-800 hover:border-navy-500",
                )}
              >
                {fa(item)}
              </Link>
            </li>
          ),
        )}
      </ul>

      {arrow(page + 1, "next", "صفحه بعد")}
    </nav>
  );
}

/** `1 … 4 5 6 … 12` — always shows first, last and a window around current. */
function buildPageList(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);

  if (start > 2) result.push("gap");
  for (let i = start; i <= end; i += 1) result.push(i);
  if (end < total - 1) result.push("gap");

  result.push(total);
  return result;
}
