import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

/**
 * Inner-page header.
 *
 * One component drives the top of every non-home page so breadcrumbs, eyebrow,
 * H1 and lead always sit on the same grid. `tone="dark"` is reserved for the
 * pages that carry the most institutional weight (arbitration, about).
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  breadcrumbs,
  tone = "light",
  aside,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  breadcrumbs: Crumb[];
  tone?: "light" | "dark";
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const onDark = tone === "dark";

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b",
        onDark ? "on-navy border-white/10" : "border-line bg-paper-2/40",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70",
          onDark ? "grid-lines" : "grid-lines-light",
        )}
      />

      <div className="container-x relative py-8 lg:py-10">
        <Breadcrumbs items={breadcrumbs} onDark={onDark} />
      </div>

      <div className="container-x relative pb-12 lg:pb-16">
        <div
          className={cn(
            "flex flex-col gap-8",
            aside && "lg:flex-row lg:items-end lg:justify-between lg:gap-14",
          )}
        >
          <div className="max-w-3xl">
            {eyebrow && <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>}
            <h1
              className={cn(
                "display-2 mt-5",
                onDark && "text-white",
              )}
            >
              {title}
            </h1>
            {lead && (
              <p className={cn("lead mt-6 max-w-2xl", onDark && "lead-on-dark")}>
                {lead}
              </p>
            )}
          </div>

          {aside && <div className="shrink-0">{aside}</div>}
        </div>

        {children}
      </div>
    </section>
  );
}
