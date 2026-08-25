"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import {
  WEEKDAYS_SHORT,
  addJalaliMonths,
  buildJalaliMonth,
  jalaliMonthTitle,
  toJalali,
} from "@/lib/utils/jalali";
import { Icon } from "@/components/ui/icon";

/**
 * Jalali (Solar Hijri) date picker.
 *
 * A Saturday-first month grid built from the in-house converter — no native
 * `<input type="date">`, which would show a Gregorian calendar and confuse
 * Iranian users. Disabled days (past, Fridays, beyond the booking horizon)
 * stay in the grid so the month keeps its shape.
 */
export function JalaliCalendar({
  value,
  onChange,
  isDisabled,
  minIso,
  maxIso,
}: {
  value?: string;
  onChange: (iso: string) => void;
  /** Extra per-day rule, e.g. closed days. */
  isDisabled?: (iso: string) => boolean;
  minIso: string;
  maxIso: string;
}) {
  const today = useMemo(() => toJalali(new Date()), []);
  const initial = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      return toJalali(new Date(y, m - 1, d));
    }
    return today;
  }, [value, today]);

  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm });

  const cells = useMemo(() => buildJalaliMonth(view.jy, view.jm), [view]);

  const monthHasSelectableDay = cells.some(
    (cell) =>
      cell.iso &&
      cell.iso >= minIso &&
      cell.iso <= maxIso &&
      !(isDisabled?.(cell.iso) ?? false),
  );

  const shift = (delta: number) => setView(addJalaliMonths(view.jy, view.jm, delta));

  // Bound month navigation to the bookable window.
  const firstIso = cells.find((c) => c.iso)?.iso ?? "";
  const lastIso = [...cells].reverse().find((c) => c.iso)?.iso ?? "";
  const canGoBack = firstIso > minIso;
  const canGoForward = lastIso < maxIso;

  return (
    <div className="surface p-4 sm:p-5">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="ماه قبل"
          className="flex size-10 items-center justify-center rounded-sm border border-line-2 text-navy-800 transition-colors hover:border-navy-900 disabled:opacity-35 disabled:hover:border-line-2"
        >
          <Icon name="chevron-end" size={17} />
        </button>

        <p
          aria-live="polite"
          className="text-[0.9375rem] font-semibold text-navy-900"
        >
          {jalaliMonthTitle(view.jy, view.jm)}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="ماه بعد"
          className="flex size-10 items-center justify-center rounded-sm border border-line-2 text-navy-800 transition-colors hover:border-navy-900 disabled:opacity-35 disabled:hover:border-line-2"
        >
          <Icon name="chevron-start" size={17} />
        </button>
      </div>

      {/* weekday header */}
      <div className="mt-5 grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((day, index) => (
          <div
            key={day}
            aria-hidden="true"
            className={cn(
              "flex h-8 items-center justify-center text-[0.75rem] font-semibold",
              index === 6 ? "text-danger/60" : "text-muted-2",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* days */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell.iso) {
            return <div key={`blank-${index}`} aria-hidden="true" />;
          }

          const outOfRange = cell.iso < minIso || cell.iso > maxIso;
          const disabled =
            cell.isPast || outOfRange || (isDisabled?.(cell.iso) ?? false);
          const selected = value === cell.iso;

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(cell.iso)}
              aria-pressed={selected}
              aria-label={`${fa(cell.jd)} ${jalaliMonthTitle(view.jy, view.jm)}`}
              className={cn(
                "relative flex h-11 items-center justify-center rounded-sm border text-[0.875rem] font-medium tabular-nums transition-all duration-200",
                selected
                  ? "border-navy-900 bg-navy-900 text-white shadow-sm"
                  : disabled
                    ? "cursor-not-allowed border-transparent text-muted-2/45"
                    : "border-line text-navy-900 hover:border-navy-500 hover:bg-paper-2",
                cell.isToday && !selected && "border-gold-400",
              )}
            >
              {fa(cell.jd)}
              {cell.isToday && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-1.5 size-1 rounded-full",
                    selected ? "bg-gold-300" : "bg-gold-500",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {!monthHasSelectableDay && (
        <p className="mt-4 rounded-sm bg-warning-soft px-3 py-2.5 text-center text-[0.8125rem] text-warning">
          در این ماه روز قابل رزروی وجود ندارد. ماه دیگری را انتخاب کنید.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[0.75rem] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-gold-400" />
          امروز
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-navy-900" />
          انتخاب‌شده
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-paper-3" />
          غیرقابل انتخاب
        </span>
      </div>
    </div>
  );
}
