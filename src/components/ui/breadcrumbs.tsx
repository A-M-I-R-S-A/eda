import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { Icon } from "./icon";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb trail. Pair with `breadcrumbJsonLd()` on the page so the same
 * trail is exposed to search engines.
 */
export function Breadcrumbs({
  items,
  onDark = false,
  className,
}: {
  items: Crumb[];
  onDark?: boolean;
  className?: string;
}) {
  const all: Crumb[] = [{ label: "صفحه اصلی", href: ROUTES.home }, ...items];

  return (
    <nav aria-label="مسیر صفحه" className={cn("min-w-0", className)}>
      <ol
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]",
          onDark ? "text-white/55" : "text-muted",
        )}
      >
        {all.map((crumb, index) => {
          const isLast = index === all.length - 1;

          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <Icon
                  name="chevron-start"
                  size={13}
                  className={onDark ? "text-white/30" : "text-muted-2/70"}
                />
              )}

              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className={cn(
                    "transition-colors duration-200",
                    onDark ? "hover:text-gold-200" : "hover:text-navy-800",
                  )}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "font-medium",
                    onDark ? "text-white/80" : "text-navy-800",
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
