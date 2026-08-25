/**
 * Persian text & numeral helpers.
 *
 * Every number rendered in the UI must pass through `fa()` — Persian users
 * expect ۰۱۲۳ rather than 0123, and no web font does that conversion for us.
 */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;

/** Convert every ASCII digit in a value to its Persian counterpart. */
export function fa(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** Convert Persian/Arabic digits back to ASCII — used before validation. */
export function toEnDigits(value: string): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) {
    const faIndex = FA_DIGITS.indexOf(ch as (typeof FA_DIGITS)[number]);
    if (faIndex > -1) {
      out += String(faIndex);
      continue;
    }
    const arIndex = AR_DIGITS.indexOf(ch as (typeof AR_DIGITS)[number]);
    if (arIndex > -1) {
      out += String(arIndex);
      continue;
    }
    out += ch;
  }
  return out;
}

/** `1234567` → `۱٬۲۳۴٬۵۶۷` (Persian thousands separator is U+066C). */
export function faNumber(value: number): string {
  if (!Number.isFinite(value)) return fa(0);
  const [int, frac] = Math.abs(value).toString().split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  const sign = value < 0 ? "‎-" : "";
  return sign + fa(frac ? `${grouped}.${frac}` : grouped);
}

/** Money formatter for placeholder fee bands. */
export function faToman(value: number): string {
  return `${faNumber(value)} تومان`;
}

/**
 * Normalise Persian typing quirks before storing or comparing text:
 * Arabic ي/ك → Persian ی/ک, remove tatweel, collapse whitespace.
 */
export function normalizeFa(value: string): string {
  return value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ـ/g, "")
    .replace(/‌{2,}/g, "‌")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip everything except ASCII digits (after converting Persian digits). */
export function digitsOnly(value: string): string {
  return toEnDigits(value).replace(/\D/g, "");
}

/**
 * Format an Iranian mobile number for display: `۰۹۱۲ ۳۴۵ ۶۷۸۹`.
 * Falls back to the raw input when the shape is unexpected.
 */
export function faPhone(value: string): string {
  const d = digitsOnly(value);
  if (d.length === 11 && d.startsWith("0")) {
    return fa(`${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`);
  }
  if (d.length === 11 && d.startsWith("021")) {
    return fa(`${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`);
  }
  return fa(value);
}

/** Persian pluralisation is invariant, so this only formats the count. */
export function faCount(count: number, noun: string): string {
  return `${faNumber(count)} ${noun}`;
}

/** `۸ دقیقه مطالعه` */
export function readingTimeLabel(minutes: number): string {
  return `${faNumber(minutes)} دقیقه مطالعه`;
}

/** Truncate on a word boundary without breaking Persian ligatures. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Rough reading-time estimate for Persian prose (~200 words/minute). */
export function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
