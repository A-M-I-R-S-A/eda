import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { UI } from "@/lib/config/labels";
import { ButtonLink } from "./button";
import { Icon, Spinner, type IconName } from "./icon";

/**
 * Loading / empty / error / success states.
 *
 * Every list and form in the application is expected to use these instead of
 * rendering nothing, so a slow or failed request never looks like a bug.
 */

/* -------------------------------------------------------------------------- */
/*  Skeletons                                                                 */
/* -------------------------------------------------------------------------- */

export function Skeleton({
  className,
  rounded = "sm",
}: {
  className?: string;
  rounded?: "xs" | "sm" | "full";
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton",
        rounded === "full" ? "rounded-full" : rounded === "xs" ? "rounded-xs" : "rounded-sm",
        className,
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="surface flex flex-col gap-4 p-6">
      <Skeleton className="h-9 w-9" />
      <Skeleton className="h-5 w-2/5" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3"
      aria-label={UI.loading}
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="surface overflow-hidden" role="status" aria-label={UI.loading}>
      <div className="flex gap-4 border-b border-line bg-paper-2 px-5 py-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-line px-5 py-4 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline loading                                                            */
/* -------------------------------------------------------------------------- */

export function LoadingState({
  label = UI.loading,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted",
        className,
      )}
    >
      <Spinner size={26} className="text-navy-600" />
      <p className="text-[0.875rem]">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty / error                                                             */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20",
        className,
      )}
    >
      <span className="mb-5 flex size-14 items-center justify-center rounded-full border border-line bg-paper-2 text-muted-2">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="text-[1.0625rem] font-bold text-navy-900">{title}</h3>
      {description && (
        <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-[1.95] text-muted">
          {description}
        </p>
      )}
      {action && (
        <ButtonLink href={action.href} variant="outline" size="md" className="mt-6">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}

export function ErrorState({
  title = "خطا در دریافت اطلاعات",
  description = UI.genericError,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <span className="mb-5 flex size-14 items-center justify-center rounded-full border border-danger/20 bg-danger-soft text-danger">
        <Icon name="alert" size={24} />
      </span>
      <h3 className="text-[1.0625rem] font-bold text-navy-900">{title}</h3>
      <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-[1.95] text-muted">
        {description}
      </p>
      {onRetry && <div className="mt-6">{onRetry}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Alerts                                                                    */
/* -------------------------------------------------------------------------- */

export type AlertTone = "info" | "success" | "warning" | "danger";

const ALERT_STYLES: Record<AlertTone, { box: string; icon: IconName; iconColor: string }> = {
  info: {
    box: "border-info/20 bg-info-soft text-info",
    icon: "info",
    iconColor: "text-info",
  },
  success: {
    box: "border-success/20 bg-success-soft text-success",
    icon: "check-circle",
    iconColor: "text-success",
  },
  warning: {
    box: "border-warning/25 bg-warning-soft text-warning",
    icon: "alert",
    iconColor: "text-warning",
  },
  danger: {
    box: "border-danger/20 bg-danger-soft text-danger",
    icon: "alert",
    iconColor: "text-danger",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const style = ALERT_STYLES[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-sm border px-4 py-3.5",
        style.box,
        className,
      )}
    >
      <Icon name={style.icon} size={18} className={cn("mt-0.5 shrink-0", style.iconColor)} />
      <div className="min-w-0 flex-1 text-[0.875rem] leading-[1.9]">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-current/90")}>{children}</div>}
      </div>
    </div>
  );
}
