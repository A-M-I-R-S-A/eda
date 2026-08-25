import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/config/labels";
import { Icon, type IconName } from "./icon";

const TONES: Record<Tone, string> = {
  neutral: "bg-paper-3/70 text-ink-2 border-line-2",
  info: "bg-info-soft text-info border-info/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
};

const DOT_TONES: Record<Tone, string> = {
  neutral: "bg-muted-2",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  icon,
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  icon?: IconName;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border font-medium leading-none whitespace-nowrap",
        size === "sm" ? "px-2 py-1 text-[0.6875rem]" : "px-2.5 py-1.5 text-[0.75rem]",
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", DOT_TONES[tone])}
        />
      )}
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

/** Small uppercase-ish category tag used on article and service cards. */
export function CategoryTag({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2.5 py-1 text-[0.6875rem] font-semibold",
        tone === "light"
          ? "bg-navy-900/[0.055] text-navy-700"
          : "bg-white/10 text-gold-200 backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </span>
  );
}
