import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Arbitrator portrait.
 *
 * When a real photograph has been uploaded it is rendered (optimised, lazy,
 * AVIF/WebP). Until then we draw a **designed monogram plate** rather than a
 * grey silhouette or a stock photo of someone at a desk: deterministic
 * geometry keyed off the person's name so every card looks intentional and no
 * two look alike.
 */

const PATTERNS = 5;

function seedOf(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Single initial of the family name.
 *
 * Two-letter initials are wrong for Persian: the letters would join into a
 * meaningless ligature (م + ر → "مر"), which looks like a typo rather than a
 * monogram. One letter always reads as deliberate.
 */
function initial(fullName: string): string {
  const cleaned = fullName
    .replace(/^(دکتر|مهندس|آقای|خانم|استاد|سرکار)\s+/u, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  return parts[parts.length - 1].slice(0, 1);
}

function PatternLayer({ variant }: { variant: number }) {
  const gold = "#c8a96a";
  const white = "#ffffff";

  switch (variant) {
    case 0:
      return (
        <g stroke={white} strokeOpacity="0.12" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx="150" cy="230" r={30 + i * 26} fill="none" />
          ))}
          <circle cx="150" cy="230" r="82" fill="none" stroke={gold} strokeOpacity="0.5" />
        </g>
      );
    case 1:
      return (
        <g stroke={white} strokeOpacity="0.12" strokeWidth="1">
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={-40 + i * 34} y1="0" x2={40 + i * 34} y2="360" />
          ))}
          <line x1="120" y1="0" x2="200" y2="360" stroke={gold} strokeOpacity="0.45" />
        </g>
      );
    case 2:
      return (
        <g>
          {Array.from({ length: 7 }).map((_, i) => (
            <rect
              key={i}
              x={24 + i * 16}
              y={24 + i * 16}
              width={252 - i * 32}
              height={312 - i * 32}
              fill="none"
              stroke={i === 2 ? gold : white}
              strokeOpacity={i === 2 ? 0.5 : 0.1}
            />
          ))}
        </g>
      );
    case 3:
      return (
        <g>
          <path
            d="M40 340V190a110 110 0 0 1 220 0v150"
            fill="none"
            stroke={white}
            strokeOpacity="0.14"
          />
          <path
            d="M78 340V196a72 72 0 0 1 144 0v144"
            fill="none"
            stroke={gold}
            strokeOpacity="0.42"
          />
          <path d="M12 340h276" stroke={white} strokeOpacity="0.14" />
        </g>
      );
    default:
      return (
        <g fill={white}>
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 5 }).map((_, c) => (
              <circle
                key={`${r}-${c}`}
                cx={45 + c * 52}
                cy={60 + r * 50}
                r={r === 2 && c === 3 ? 7 : 2.5}
                fill={r === 2 && c === 3 ? gold : white}
                fillOpacity={r === 2 && c === 3 ? 1 : 0.16}
              />
            )),
          )}
        </g>
      );
  }
}

export function Portrait({
  fullName,
  photoUrl,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px",
  priority = false,
  rounded = false,
}: {
  fullName: string;
  photoUrl?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: boolean;
}) {
  const wrapper = cn(
    "relative overflow-hidden bg-navy-900",
    rounded ? "rounded-full" : "rounded-sm",
    className,
  );

  if (photoUrl) {
    return (
      <div className={wrapper}>
        <Image
          src={photoUrl}
          alt={`تصویر ${fullName}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const variant = seedOf(fullName) % PATTERNS;

  return (
    <div className={wrapper} role="img" aria-label={`نشان ${fullName}`}>
      <svg
        viewBox="0 0 300 360"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`pg-${variant}`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0e1b33" />
            <stop offset="1" stopColor="#060d1c" />
          </linearGradient>
        </defs>
        <rect width="300" height="360" fill={`url(#pg-${variant})`} />
        <PatternLayer variant={variant} />
      </svg>

      <span className="absolute inset-0 flex items-center justify-center">
        <span
          aria-hidden="true"
          className="flex size-[4.5rem] items-center justify-center rounded-full border border-gold-400/40 bg-navy-950/45 pb-1 text-[2rem] font-bold leading-none text-gold-200 backdrop-blur-[1px]"
        >
          {initial(fullName)}
        </span>
      </span>
    </div>
  );
}
