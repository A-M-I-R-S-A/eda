import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * Institutional mark.
 *
 * An abstract **keystone arch** — the load-bearing element that holds a
 * structure together. It reads as architecture and permanence rather than as
 * the usual scales/gavel clichés, and it survives being scaled down to a
 * 16px favicon.
 */
export function Monogram({
  size = 40,
  tone = "dark",
  className,
}: {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}) {
  const stroke = tone === "light" ? "#ffffff" : "#0a1428";
  const gold = tone === "light" ? "#d6bd8b" : "#b99458";

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {/* outer arch */}
      <path
        d="M6 35V18a14 14 0 0 1 28 0v17"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="square"
      />
      {/* inner arch */}
      <path
        d="M13.5 35V18.5a6.5 6.5 0 0 1 13 0V35"
        stroke={stroke}
        strokeWidth="1.1"
        strokeOpacity="0.42"
        strokeLinecap="square"
      />
      {/* keystone */}
      <path d="M16.4 2.6h7.2L25 9.6H15z" fill={gold} />
      {/* plinth */}
      <path d="M2.5 35.4h35" stroke={stroke} strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

export function Wordmark({
  name,
  shortName,
  descriptor,
  tone = "dark",
  size = "md",
  className,
}: {
  name: string;
  /**
   * Compact form shown below `sm`. The full institution name plus its
   * descriptor is far too wide for a 390px header — without this the row
   * overflows and the whole page gains a horizontal scrollbar.
   */
  shortName?: string;
  descriptor?: string;
  tone?: "dark" | "light";
  size?: "sm" | "md";
  className?: string;
}) {
  const nameClass = cn(
    "truncate font-bold leading-[1.35]",
    size === "sm" ? "text-[1.0625rem]" : "text-[1.1875rem]",
    tone === "light" ? "text-white" : "text-navy-900",
  );

  return (
    <span className={cn("flex min-w-0 flex-col justify-center", className)}>
      {shortName ? (
        <>
          <span className={cn(nameClass, "sm:hidden")}>{shortName}</span>
          <span className={cn(nameClass, "hidden sm:inline")}>{name}</span>
        </>
      ) : (
        <span className={nameClass}>{name}</span>
      )}

      {descriptor && (
        <span
          className={cn(
            "truncate text-[0.6875rem] font-medium leading-[1.5]",
            shortName && "hidden sm:inline",
            tone === "light" ? "text-white/55" : "text-muted",
          )}
        >
          {descriptor}
        </span>
      )}
    </span>
  );
}

/**
 * The institution's lockup: a mark, then its name.
 *
 * An uploaded logo replaces the **monogram**, never the name — the two are
 * independent, because a logo that is a bare symbol still needs the
 * institution written beside it, and one that already contains the name does
 * not. `showWordmark` decides that, and it is the same switch in every place
 * the lockup appears: the header, the sticky header, and the mobile drawer.
 *
 * Every caller goes through here rather than assembling the pieces itself. The
 * header used to hand-roll its own version for the uploaded-logo case, which
 * is how the drawer ended up still drawing the monogram after a logo had been
 * assigned, and how the name came to be hidden outright on small screens
 * instead of falling back to `shortName`.
 */
export function Logo({
  name,
  shortName,
  descriptor,
  tone = "dark",
  size = "md",
  href = "/",
  className,
  logoUrl,
  logoHeight,
  showWordmark = true,
}: {
  name: string;
  shortName?: string;
  descriptor?: string;
  tone?: "dark" | "light";
  size?: "sm" | "md";
  href?: string;
  className?: string;
  /** Uploaded logo. Replaces the monogram. */
  logoUrl?: string;
  /** Rendered height of the uploaded logo in px; defaults to the mark's size. */
  logoHeight?: number;
  /** Whether the name sits beside the mark. */
  showWordmark?: boolean;
}) {
  const markSize = size === "sm" ? 32 : 38;
  const imageHeight = logoHeight || markSize;

  return (
    <Link
      href={href}
      aria-label={`${name}${descriptor ? ` — ${descriptor}` : ""}`}
      className={cn(
        "group flex min-w-0 items-center gap-2.5 transition-opacity duration-300 hover:opacity-85 sm:gap-3",
        className,
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          // The link's `aria-label` already announces the institution, so
          // naming the image too would say it twice.
          alt=""
          width={Math.round(imageHeight * 4)}
          height={imageHeight}
          style={{ height: imageHeight, width: "auto" }}
          className="shrink-0 object-contain"
          priority
        />
      ) : (
        <Monogram size={markSize} tone={tone} />
      )}

      {showWordmark && (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "h-8 w-px shrink-0",
              tone === "light" ? "bg-white/15" : "bg-line-2",
            )}
          />
          <Wordmark
            name={name}
            shortName={shortName}
            descriptor={descriptor}
            tone={tone}
            size={size}
          />
        </>
      )}
    </Link>
  );
}
