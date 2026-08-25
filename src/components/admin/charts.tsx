import { cn } from "@/lib/utils/cn";
import { faNumber } from "@/lib/utils/persian";

/**
 * Hand-rolled SVG charts.
 *
 * No charting library: these three shapes are all the dashboard needs, and a
 * dependency would add far more JavaScript than the markup below. They render
 * on the server (zero client JS), scale with their container, and expose a
 * `<table>`-free accessible summary through `role="img"` + `aria-label`.
 */

const PALETTE = [
  "#22355a",
  "#35486d",
  "#5d6f92",
  "#b99458",
  "#c8a96a",
  "#94a2be",
  "#2f6f52",
];

/* -------------------------------------------------------------------------- */
/*  Vertical bars — volume over time                                          */
/* -------------------------------------------------------------------------- */

export function BarChart({
  data,
  height = 180,
  className,
  label,
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  label: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / (data.length * 1.6);
  const gap = barWidth * 0.6;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${label}: ${data
          .map((d) => `${d.label} ${faNumber(d.value)}`)
          .join("، ")}`}
      >
        {/* baseline grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2="100"
            y1={height - ratio * (height - 24) - 20}
            y2={height - ratio * (height - 24) - 20}
            stroke="#e4e0d6"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Mirrored so the first datum lands on the right, matching the
            RTL label row below. */}
        <g transform="scale(-1 1) translate(-100 0)">
          {data.map((item, index) => {
            const barHeight = (item.value / max) * (height - 44);
            const x = index * (barWidth + gap) + gap / 2;
            const isLast = index === data.length - 1;

            return (
              <rect
                key={`${item.label}-${index}`}
                x={x}
                y={height - 20 - barHeight}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                fill={isLast ? "#b99458" : "#22355a"}
                opacity={isLast ? 1 : 0.82}
              />
            );
          })}
        </g>
      </svg>

      <div className="mt-2 flex justify-between text-[0.6875rem] text-muted-2">
        {data.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex-1 text-center">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Donut — composition                                                       */
/* -------------------------------------------------------------------------- */

export function DonutChart({
  data,
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
  className,
  label,
}: {
  data: { label: string; value: number }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
  label: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${label}: ${data
            .map((d) => `${d.label} ${faNumber(d.value)}`)
            .join("، ")}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ece9e1"
            strokeWidth={thickness}
          />

          {total > 0 &&
            data.map((item, index) => {
              if (item.value === 0) return null;
              const fraction = item.value / total;
              const dash = fraction * circumference;
              const element = (
                <circle
                  key={item.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={PALETTE[index % PALETTE.length]}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  // Start at 12 o'clock and run clockwise.
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += dash;
              return element;
            })}
        </svg>

        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <span className="text-[1.5rem] font-bold text-navy-950 tabular-nums">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="mt-0.5 text-[0.6875rem] text-muted">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-2.5">
        {data.map((item, index) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-3 text-[0.8125rem]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: PALETTE[index % PALETTE.length] }}
              />
              <span className="truncate text-ink-2">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-navy-900 tabular-nums">
              {faNumber(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Horizontal bars — ranked comparison                                       */
/* -------------------------------------------------------------------------- */

export function RankedBars({
  data,
  className,
}: {
  data: { label: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {data.map((item, index) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
            <span className="text-ink-2">{item.label}</span>
            <span className="font-semibold text-navy-900 tabular-nums">
              {faNumber(item.value)}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-paper-3">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quint)]"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: PALETTE[index % PALETTE.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
