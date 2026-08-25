import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";

/**
 * Editorial section scaffolding: the eyebrow → heading → lead → action rhythm
 * that gives every page the same typographic spine.
 */

export function Eyebrow({
  children,
  onDark = false,
  className,
}: {
  children: ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("eyebrow", onDark && "eyebrow-on-dark", className)}>
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "start",
  onDark = false,
  as: Tag = "h2",
  action,
  className,
  maxWidth = "48rem",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "start" | "center";
  onDark?: boolean;
  as?: "h1" | "h2" | "h3";
  action?: ReactNode;
  className?: string;
  maxWidth?: string;
}) {
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
          "flex flex-col gap-4",
          align === "center" && "items-center text-center",
        )}
        style={{ maxWidth }}
      >
        {eyebrow && <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>}
        <Tag
          className={cn(
            Tag === "h1" ? "display-1" : "display-2",
            onDark && "text-white",
          )}
        >
          {title}
        </Tag>
        {lead && (
          <p className={cn("lead", onDark && "lead-on-dark")}>{lead}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Numbered section marker used in the arbitration process and about page. */
export function SectionIndex({
  value,
  onDark = false,
  className,
}: {
  value: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[0.75rem] font-semibold tabular-nums",
        onDark ? "text-white/40" : "text-muted-2",
        className,
      )}
    >
      <span className={cn("h-px w-6", onDark ? "bg-white/25" : "bg-line-2")} />
      {value}
    </span>
  );
}

/** Full-bleed dark band used to break up the light page rhythm. */
export function DarkBand({
  children,
  className,
  pattern = true,
}: {
  children: ReactNode;
  className?: string;
  pattern?: boolean;
}) {
  return (
    <section className={cn("on-navy relative overflow-hidden", className)}>
      {pattern && (
        <div
          aria-hidden="true"
          className="grid-lines pointer-events-none absolute inset-0 opacity-70"
        />
      )}
      <div className="relative">{children}</div>
    </section>
  );
}

/** "View all" link that sits beside a section heading. */
export function SectionLink({
  href,
  children,
  onDark = false,
}: {
  href: string;
  children: ReactNode;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "link-underline group text-[0.9375rem] font-semibold",
        onDark ? "text-gold-200 hover:text-gold-100" : "text-navy-800 hover:text-navy-950",
      )}
    >
      <span>{children}</span>
      <Icon
        name="arrow-forward"
        size={16}
        className="transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:-translate-x-1"
      />
    </Link>
  );
}
