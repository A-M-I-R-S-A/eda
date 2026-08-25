import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Icon, Spinner, type IconName } from "./icon";

/**
 * Button system.
 *
 * Square-ish corners (3px) and flat fills on purpose — pill buttons and heavy
 * gradients read as consumer SaaS, not as an established legal institution.
 * Minimum target height is 44px so every control is comfortably tappable.
 */

export type ButtonVariant =
  | "primary"
  | "accent"
  | "outline"
  | "outline-light"
  | "ghost"
  | "ghost-light"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-navy-900 text-white border border-navy-900 hover:bg-navy-800 hover:border-navy-800 active:bg-navy-950 shadow-[0_1px_2px_rgba(10,20,40,0.16)]",
  accent:
    "bg-gold-400 text-navy-950 border border-gold-400 hover:bg-gold-300 hover:border-gold-300 active:bg-gold-500 font-semibold",
  outline:
    "bg-transparent text-navy-900 border border-line-2 hover:border-navy-900 hover:bg-navy-900/[0.03] active:bg-navy-900/[0.06]",
  "outline-light":
    "bg-transparent text-white border border-white/25 hover:border-gold-300 hover:text-gold-200 active:bg-white/5",
  ghost:
    "bg-transparent text-navy-800 border border-transparent hover:bg-navy-900/[0.05] active:bg-navy-900/[0.08]",
  "ghost-light":
    "bg-transparent text-white/85 border border-transparent hover:bg-white/10 hover:text-white",
  danger:
    "bg-transparent text-danger border border-danger/30 hover:bg-danger/[0.06] hover:border-danger/60",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 text-[0.8125rem] gap-1.5",
  md: "min-h-11 px-5 text-[0.9375rem] gap-2",
  lg: "min-h-[3.25rem] px-7 text-base gap-2.5",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center rounded-sm font-medium leading-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-[var(--ease-in-out-soft)]",
    "select-none whitespace-nowrap active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  /** Places the icon on the trailing (left, in RTL) edge. */
  iconEnd?: IconName;
  children?: ReactNode;
  className?: string;
}

export interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant,
  size = "md",
  block,
  icon,
  iconEnd,
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const iconSize = size === "lg" ? 20 : size === "sm" ? 15 : 17;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, block, className })}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={iconSize} />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={iconSize} />}
          {children && <span>{children}</span>}
          {iconEnd && <Icon name={iconEnd} size={iconSize} />}
        </>
      )}
    </button>
  );
}

export interface ButtonLinkProps extends CommonProps {
  href: string;
  prefetch?: boolean;
  target?: string;
  rel?: string;
  "aria-label"?: string;
  title?: string;
}

export function ButtonLink({
  href,
  variant,
  size = "md",
  block,
  icon,
  iconEnd,
  children,
  className,
  ...props
}: ButtonLinkProps) {
  const iconSize = size === "lg" ? 20 : size === "sm" ? 15 : 17;
  const isExternal = /^https?:\/\//.test(href);

  const content = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      {children && <span>{children}</span>}
      {iconEnd && (
        <Icon
          name={iconEnd}
          size={iconSize}
          className="transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:-translate-x-1"
        />
      )}
    </>
  );

  const classes = buttonStyles({ variant, size, block, className: cn("group", className) });

  if (isExternal) {
    return (
      <a href={href} className={classes} rel="noopener noreferrer" {...props}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {content}
    </Link>
  );
}

/**
 * Text link with an animated rule and a nudging arrow — the house
 * "read more" affordance.
 */
export function ArrowLink({
  href,
  children,
  className,
  tone = "dark",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  tone?: "dark" | "light" | "gold";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "link-underline group text-[0.9375rem] font-semibold",
        tone === "dark" && "text-navy-800 hover:text-navy-950",
        tone === "light" && "text-white/90 hover:text-white",
        tone === "gold" && "text-gold-600 hover:text-gold-700",
        className,
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
