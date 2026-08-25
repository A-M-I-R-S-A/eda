/**
 * Jalali (Solar Hijri) calendar conversion and formatting.
 *
 * Implemented in-house rather than pulled from a package: it is ~120 lines of
 * pure arithmetic, works identically on server and client, and keeps the
 * client bundle free of another dependency. The algorithm is the standard
 * Borkowski leap-year-breaks method.
 *
 * All *storage* stays Gregorian ISO (`YYYY-MM-DD`); Jalali exists only at the
 * presentation and date-picker layer.
 */

import { fa } from "./persian";

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - b * Math.floor(a / b);

// Years at which the 33-year leap cycle pattern shifts.
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

interface JalCal {
  leap: number;
  gy: number;
  march: number;
}

function jalCal(jy: number): JalCal {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new RangeError(`Jalaali year out of range: ${jy}`);
  }

  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

/** Gregorian → Julian Day Number. */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** Julian Day Number → Gregorian. */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (jalCal(jy).leap === 1) k += 1;
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function toJalali(date: Date): JalaliDate {
  return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

export function toGregorian(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = d2g(j2d(jy, jm, jd));
  return new Date(gy, gm - 1, gd);
}

export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Week starts on Saturday in Iran. */
export const WEEKDAYS_LONG = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

/** Index within a Saturday-first week (0 = Saturday … 6 = Friday). */
export function jalaliWeekdayIndex(date: Date): number {
  // JS: 0 = Sunday … 6 = Saturday. Saturday must map to 0.
  return (date.getDay() + 1) % 7;
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                */
/* -------------------------------------------------------------------------- */

export type DateInput = Date | string | number;

function asDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  // Bare `YYYY-MM-DD` must be read as local time, not UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(input);
}

/** `۱۴۰۴/۰۵/۳۰` */
export function formatJalaliShort(input: DateInput): string {
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return "";
  const { jy, jm, jd } = toJalali(d);
  return fa(
    `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`,
  );
}

/** `۳۰ مرداد ۱۴۰۴` */
export function formatJalali(input: DateInput): string {
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return "";
  const { jy, jm, jd } = toJalali(d);
  return `${fa(jd)} ${JALALI_MONTHS[jm - 1]} ${fa(jy)}`;
}

/** `پنجشنبه، ۳۰ مرداد ۱۴۰۴` */
export function formatJalaliLong(input: DateInput): string {
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return "";
  return `${WEEKDAYS_LONG[jalaliWeekdayIndex(d)]}، ${formatJalali(d)}`;
}

/** `۳۰ مرداد ۱۴۰۴ – ساعت ۱۴:۳۰` */
export function formatJalaliDateTime(input: DateInput): string {
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatJalali(d)} – ساعت ${fa(`${hh}:${mm}`)}`;
}

/** `۱۴:۳۰` */
export function formatTime(time: string): string {
  return fa(time);
}

/** Relative phrasing used in admin lists: `۳ روز پیش`. */
export function formatRelative(input: DateInput): string {
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return `${fa(minutes)} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${fa(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${fa(days)} روز پیش`;
  const months = Math.round(days / 30);
  if (months < 12) return `${fa(months)} ماه پیش`;
  return `${fa(Math.round(months / 12))} سال پیش`;
}

/* -------------------------------------------------------------------------- */
/*  Calendar grid (used by the appointment date picker)                        */
/* -------------------------------------------------------------------------- */

export interface CalendarCell {
  /** Gregorian ISO `YYYY-MM-DD`; empty string for leading blanks. */
  iso: string;
  jd: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  weekdayIndex: number;
}

export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build a Saturday-first month grid for a Jalali month, padded with blanks so
 * the first day lands in the correct column.
 */
export function buildJalaliMonth(jy: number, jm: number): CalendarCell[] {
  const length = jalaliMonthLength(jy, jm);
  const firstDay = toGregorian(jy, jm, 1);
  const offset = jalaliWeekdayIndex(firstDay);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toISODateString(today);

  const cells: CalendarCell[] = [];

  for (let i = 0; i < offset; i += 1) {
    cells.push({
      iso: "",
      jd: 0,
      isCurrentMonth: false,
      isToday: false,
      isPast: true,
      weekdayIndex: i,
    });
  }

  for (let day = 1; day <= length; day += 1) {
    const g = toGregorian(jy, jm, day);
    const iso = toISODateString(g);
    cells.push({
      iso,
      jd: day,
      isCurrentMonth: true,
      isToday: iso === todayIso,
      isPast: g.getTime() < today.getTime(),
      weekdayIndex: jalaliWeekdayIndex(g),
    });
  }

  return cells;
}

export function addJalaliMonths(
  jy: number,
  jm: number,
  delta: number,
): { jy: number; jm: number } {
  const total = jy * 12 + (jm - 1) + delta;
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1 };
}

/** Friday is the Iranian weekend. */
export function isWeekend(iso: string): boolean {
  return jalaliWeekdayIndex(asDate(iso)) === 6;
}

export function jalaliMonthTitle(jy: number, jm: number): string {
  return `${JALALI_MONTHS[jm - 1]} ${fa(jy)}`;
}
