import { cn } from "@/lib/utils/cn";

/**
 * Hero artwork.
 *
 * Abstract architectural geometry: a keystone arch (echoing the institutional
 * mark) with two converging sight-lines — two positions resolving into a
 * single point. Deliberately *not* a stock photograph of a courtroom.
 *
 * Pure inline SVG: no image request, no layout shift, sharp at any density,
 * and the stroke-draw animation is suppressed by the global
 * `prefers-reduced-motion` rule.
 */
export function HeroVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 780"
      className={cn("size-full", className)}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="hero-panel" x1="1" y1="0" x2="0.1" y2="1">
          <stop offset="0" stopColor="#13223d" />
          <stop offset="0.55" stopColor="#0c1729" />
          <stop offset="1" stopColor="#070f1f" />
        </linearGradient>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="50%" cy="26%" r="52%">
          <stop offset="0" stopColor="#c8a96a" stopOpacity="0.16" />
          <stop offset="1" stopColor="#c8a96a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="560" height="780" fill="url(#hero-panel)" />
      <rect width="560" height="780" fill="url(#hero-glow)" />

      {/* fine vertical measure grid */}
      <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1">
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={i} x1={40 * (i + 1)} y1="0" x2={40 * (i + 1)} y2="780" />
        ))}
      </g>

      {/* horizontal registration ticks */}
      <g stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1="0" y1={80 * (i + 1)} x2="560" y2={80 * (i + 1)} />
        ))}
      </g>

      {/* converging sight-lines: two positions resolving into one point */}
      <g stroke="#c8a96a" strokeOpacity="0.4" strokeWidth="1">
        <line x1="96" y1="656" x2="280" y2="252" />
        <line x1="464" y1="656" x2="280" y2="252" />
      </g>
      <g stroke="#ffffff" strokeOpacity="0.09" strokeWidth="1">
        <line x1="150" y1="700" x2="280" y2="252" />
        <line x1="410" y1="700" x2="280" y2="252" />
        <line x1="120" y1="600" x2="280" y2="252" />
        <line x1="440" y1="600" x2="280" y2="252" />
      </g>

      {/* nested arches */}
      <g fill="none" strokeLinecap="square">
        <path
          d="M130 660V400a150 150 0 0 1 300 0v260"
          stroke="#ffffff"
          strokeOpacity="0.30"
          strokeWidth="1.4"
        />
        <path
          d="M175 660V400a105 105 0 0 1 210 0v260"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="1.1"
        />
        <path
          d="M220 660V400a60 60 0 0 1 120 0v260"
          stroke="#ffffff"
          strokeOpacity="0.09"
          strokeWidth="1"
        />
      </g>

      {/* arch soffit wash */}
      <path
        d="M175 660V400a105 105 0 0 1 210 0v260z"
        fill="url(#hero-fade)"
        opacity="0.45"
      />

      {/* keystone */}
      <path d="M258 214h44l10 42h-64z" fill="#c8a96a" />
      <path d="M258 214h44l10 42h-64z" fill="#ffffff" fillOpacity="0.1" />

      {/* node markers */}
      <g fill="#c8a96a">
        <circle cx="280" cy="252" r="3.5" />
        <circle cx="130" cy="400" r="2.5" fillOpacity="0.65" />
        <circle cx="430" cy="400" r="2.5" fillOpacity="0.65" />
      </g>

      {/* plinth */}
      <g stroke="#ffffff">
        <line x1="90" y1="660" x2="470" y2="660" strokeOpacity="0.32" strokeWidth="1.4" />
        <line x1="90" y1="674" x2="470" y2="674" strokeOpacity="0.09" />
      </g>
      <line
        x1="90"
        y1="660"
        x2="240"
        y2="660"
        stroke="#c8a96a"
        strokeOpacity="0.75"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/**
 * Compact geometric plate used behind section headers and card media where a
 * full hero composition would be too heavy.
 */
export function GeometryPlate({
  variant = 1,
  className,
}: {
  variant?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 260"
      className={cn("size-full", className)}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="260" fill="#0a1428" />
      <g stroke="#ffffff" strokeOpacity="0.06">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={40 * (i + 1)} y1="0" x2={40 * (i + 1)} y2="260" />
        ))}
      </g>

      {variant === 1 && (
        <g fill="none">
          <path d="M60 230V150a80 80 0 0 1 160 0v80" stroke="#ffffff" strokeOpacity="0.22" />
          <path d="M100 230v-78a40 40 0 0 1 80 0v78" stroke="#c8a96a" strokeOpacity="0.5" />
          <line x1="30" y1="230" x2="370" y2="230" stroke="#ffffff" strokeOpacity="0.22" />
        </g>
      )}

      {variant === 2 && (
        <g>
          {Array.from({ length: 8 }).map((_, i) => (
            <circle
              key={i}
              cx="300"
              cy="130"
              r={26 + i * 24}
              fill="none"
              stroke={i === 2 ? "#c8a96a" : "#ffffff"}
              strokeOpacity={i === 2 ? 0.5 : 0.11}
            />
          ))}
          <circle cx="300" cy="130" r="4" fill="#c8a96a" />
        </g>
      )}

      {variant === 3 && (
        <g stroke="#ffffff" strokeOpacity="0.12">
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i} x1={-60 + i * 52} y1="260" x2={60 + i * 52} y2="0" />
          ))}
          <line x1="140" y1="260" x2="260" y2="0" stroke="#c8a96a" strokeOpacity="0.5" />
        </g>
      )}
    </svg>
  );
}
