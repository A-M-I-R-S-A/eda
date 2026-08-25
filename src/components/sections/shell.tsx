import type { ReactNode } from "react";
import type { PageSection, SectionData } from "@/types";
import { cn } from "@/lib/utils/cn";
import { str } from "@/lib/cms/section-data";
import { Eyebrow } from "@/components/ui/section";

/**
 * Shared chrome for every CMS section.
 *
 * Background and vertical rhythm are section-level settings an administrator
 * picks from a dropdown, so resolving them in one place is what stops
 * seventeen renderers from each inventing their own spacing scale.
 */

export const SECTION_BACKGROUNDS = {
  paper: "bg-paper",
  muted: "bg-paper-2/50",
  white: "bg-white",
  navy: "on-navy relative overflow-hidden",
} as const;

const SECTION_SPACING = {
  none: "",
  sm: "section-sm",
  md: "section",
  lg: "section py-20 md:py-28 xl:py-36",
} as const;

export function SectionShell({
  section,
  children,
  className,
  /** Suppresses the container so a section can go full-bleed. */
  bleed = false,
}: {
  section: PageSection;
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  const onDark = section.background === "navy";

  return (
    <section
      id={`section-${section.id}`}
      data-section-type={section.type}
      className={cn(
        SECTION_BACKGROUNDS[section.background],
        !onDark && "border-b border-line",
        className,
      )}
    >
      {onDark && (
        <div
          aria-hidden="true"
          className="grid-lines pointer-events-none absolute inset-0 opacity-60"
        />
      )}

      <div className={cn("relative", SECTION_SPACING[section.spacing])}>
        {bleed ? children : <div className="container-x">{children}</div>}
      </div>
    </section>
  );
}

/**
 * The eyebrow → heading → description spine every section shares.
 *
 * Renders nothing at all when an administrator has cleared every field, so an
 * unlabelled section reads as a deliberate design choice rather than as a gap
 * where a heading failed to load.
 */
export function SectionHeader({
  data,
  onDark = false,
  align = "start",
  action,
  className,
}: {
  data: SectionData;
  onDark?: boolean;
  align?: "start" | "center";
  action?: ReactNode;
  className?: string;
}) {
  const eyebrow = str(data, "eyebrow");
  const heading = str(data, "heading");
  const description = str(data, "description");

  if (!eyebrow && !heading && !description && !action) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10",
        align === "center" && "md:flex-col md:items-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex max-w-3xl flex-col gap-4",
          align === "center" && "items-center text-center",
        )}
      >
        {eyebrow && <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>}
        {heading && (
          <h2 className={cn("display-2", onDark && "text-white")}>{heading}</h2>
        )}
        {description && (
          <p className={cn("lead", onDark && "lead-on-dark")}>{description}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Column count as Tailwind classes, resolved from the section's setting. */
export function gridColumns(count: 2 | 3 | 4): string {
  if (count === 2) return "sm:grid-cols-2";
  if (count === 4) return "sm:grid-cols-2 lg:grid-cols-4";
  return "sm:grid-cols-2 lg:grid-cols-3";
}
