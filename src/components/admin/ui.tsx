import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { faNumber } from "@/lib/utils/persian";
import { Icon, type IconName } from "@/components/ui/icon";

/** Shared admin building blocks: page header, panels, stat tiles, tables. */

export function AdminPageHeader({
  title,
  description,
  actions,
  backHref,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-muted transition-colors hover:text-navy-800"
          >
            <Icon name="arrow-forward" size={14} />
            بازگشت
          </Link>
        )}
        <h1 className="text-[1.375rem] font-bold text-navy-950 sm:text-[1.5rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[0.875rem] leading-[1.95] text-muted">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[0.9375rem] font-bold text-navy-900">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-[0.8125rem] text-muted">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  icon,
  href,
  tone = "default",
  hint,
}: {
  label: string;
  value: number;
  icon: IconName;
  href?: string;
  tone?: "default" | "accent" | "warning";
  hint?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-sm border",
            tone === "accent"
              ? "border-gold-300 bg-gold-50 text-gold-700"
              : tone === "warning"
                ? "border-warning/25 bg-warning-soft text-warning"
                : "border-line-2 text-navy-700",
          )}
        >
          <Icon name={icon} size={19} />
        </span>

        {href && (
          <Icon
            name="arrow-forward"
            size={16}
            className="mt-1 text-muted-2 transition-transform duration-400 group-hover:-translate-x-1 group-hover:text-navy-700"
          />
        )}
      </div>

      <p className="mt-5 text-[1.875rem] font-bold leading-none text-navy-950 tabular-nums">
        {faNumber(value)}
      </p>
      <p className="mt-2 text-[0.8125rem] text-muted">{label}</p>
      {hint && <p className="mt-1 text-[0.6875rem] text-muted-2">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group flex flex-col bg-white p-5 transition-colors duration-300 hover:bg-paper-2/60"
      >
        {body}
      </Link>
    );
  }

  return <div className="flex flex-col bg-white p-5">{body}</div>;
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

export function DataTable({
  headers,
  children,
  caption,
  className,
}: {
  headers: (string | { label: string; className?: string })[];
  children: ReactNode;
  caption: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[46rem] border-collapse text-start">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-paper-2/60">
            {headers.map((header, index) => {
              const isObject = typeof header !== "string";
              return (
                <th
                  key={index}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-start text-[0.75rem] font-semibold text-muted whitespace-nowrap",
                    isObject ? header.className : undefined,
                  )}
                >
                  {isObject ? header.label : header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  nowrap = false,
}: {
  children: ReactNode;
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 align-middle text-[0.8125rem] text-ink-2",
        nowrap && "whitespace-nowrap",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Right-aligned row of small action buttons. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}

export function IconAction({
  icon,
  label,
  href,
  tone = "default",
}: {
  icon: IconName;
  label: string;
  href: string;
  tone?: "default" | "danger";
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-sm border transition-colors",
        tone === "danger"
          ? "border-line-2 text-muted hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
          : "border-line-2 text-muted hover:border-navy-500 hover:text-navy-800",
      )}
    >
      <Icon name={icon} size={16} />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Filter toolbar                                                            */
/* -------------------------------------------------------------------------- */

export function FilterToolbar({
  action,
  searchName = "q",
  searchValue = "",
  searchPlaceholder = "جست‌وجو…",
  children,
  hidden,
}: {
  action: string;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  children?: ReactNode;
  /** Extra params to preserve across submissions. */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form
      action={action}
      method="get"
      className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center"
    >
      {hidden &&
        Object.entries(hidden).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null,
        )}

      <div className="relative flex-1">
        <label htmlFor={`${searchName}-input`} className="sr-only">
          {searchPlaceholder}
        </label>
        <input
          id={`${searchName}-input`}
          type="search"
          name={searchName}
          defaultValue={searchValue}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-sm border border-line-2 bg-white ps-3.5 pe-10 text-[0.8125rem] placeholder:text-muted-2/80 focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]"
        />
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-2"
        />
      </div>

      {children}

      <button
        type="submit"
        className="h-10 shrink-0 rounded-sm border border-line-2 px-4 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white"
      >
        اعمال فیلتر
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  options,
  label,
}: {
  name: string;
  value?: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div className="relative shrink-0">
      <label htmlFor={`${name}-select`} className="sr-only">
        {label}
      </label>
      <select
        id={`${name}-select`}
        name={name}
        defaultValue={value ?? ""}
        className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-line-2 bg-white ps-3.5 pe-9 text-[0.8125rem] focus:border-navy-600 focus:outline-none sm:w-44"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={15}
        className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted"
      />
    </div>
  );
}
