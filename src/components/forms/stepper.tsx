"use client";

import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { Icon } from "@/components/ui/icon";

export interface StepDefinition {
  id: string;
  label: string;
}

/**
 * Wizard progress indicator.
 *
 * Desktop shows the full labelled rail; below `md` it collapses to
 * "گام ۳ از ۷" plus a progress bar and the current step's title — a phone has
 * no room for seven labelled nodes, and shrinking them would make the whole
 * control unreadable.
 */
export function Stepper({
  steps,
  current,
  furthest,
  onSelect,
}: {
  steps: StepDefinition[];
  /** Zero-based index of the active step. */
  current: number;
  /** Highest step reached, so completed steps stay clickable. */
  furthest: number;
  onSelect: (index: number) => void;
}) {
  const progress = ((current + 1) / steps.length) * 100;

  return (
    <div>
      {/* -- mobile -------------------------------------------------------- */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[0.8125rem] font-semibold text-gold-600 tabular-nums">
            گام {fa(current + 1)} از {fa(steps.length)}
          </p>
          <p className="text-[0.8125rem] text-muted">
            {fa(Math.round(progress))}
            <span className="mx-0.5">٪</span>
          </p>
        </div>

        <h2 className="mt-2 text-[1.0625rem] font-bold text-navy-900">
          {steps[current]?.label}
        </h2>

        <div
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="پیشرفت رزرو"
          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper-3"
        >
          <div
            className="h-full rounded-full bg-navy-900 transition-[width] duration-500 ease-[var(--ease-out-quint)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* -- desktop ------------------------------------------------------- */}
      <ol className="hidden md:flex md:items-start">
        {steps.map((step, index) => {
          const done = index < furthest;
          const active = index === current;
          const reachable = index <= furthest;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 px-1">
                <button
                  type="button"
                  onClick={() => reachable && onSelect(index)}
                  disabled={!reachable}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border text-[0.8125rem] font-semibold tabular-nums transition-all duration-300",
                    active
                      ? "border-navy-900 bg-navy-900 text-white"
                      : done
                        ? "border-success bg-success-soft text-success hover:border-success/70"
                        : "border-line-2 bg-white text-muted-2",
                    reachable && !active && "cursor-pointer",
                    !reachable && "cursor-not-allowed",
                  )}
                >
                  {done ? <Icon name="check" size={16} weight={2.5} /> : fa(index + 1)}
                </button>

                <span
                  className={cn(
                    "text-center text-[0.75rem] leading-[1.7]",
                    active
                      ? "font-semibold text-navy-900"
                      : done
                        ? "text-ink-2"
                        : "text-muted-2",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-[1.0625rem] h-px min-w-4 flex-1 transition-colors duration-500",
                    index < furthest ? "bg-success/40" : "bg-line",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
