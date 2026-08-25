/**
 * Slug helpers.
 *
 * Persian titles are kept as-is in slugs (URL-encoded by the browser) only
 * when an explicit Latin slug is not supplied — but the CMS always suggests a
 * transliterated Latin slug because ASCII URLs are easier to share, log and
 * audit. Both forms are SEO-valid.
 */

const FA_TO_LATIN: Record<string, string> = {
  ا: "a", آ: "a", أ: "a", إ: "e", ب: "b", پ: "p", ت: "t", ث: "s",
  ج: "j", چ: "ch", ح: "h", خ: "kh", د: "d", ذ: "z", ر: "r", ز: "z",
  ژ: "zh", س: "s", ش: "sh", ص: "s", ض: "z", ط: "t", ظ: "z", ع: "a",
  غ: "gh", ف: "f", ق: "gh", ک: "k", ك: "k", گ: "g", ل: "l", م: "m",
  ن: "n", و: "v", ه: "h", ی: "y", ي: "y", ة: "h", ء: "", ئ: "y",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/** Transliterate a Persian string into a lowercase ASCII slug. */
export function slugify(input: string): string {
  const transliterated = Array.from(input.trim().toLowerCase())
    .map((ch) => {
      if (FA_TO_LATIN[ch] !== undefined) return FA_TO_LATIN[ch];
      if (/[a-z0-9]/.test(ch)) return ch;
      if (/[\s‌._/\\-]/.test(ch)) return "-";
      return "";
    })
    .join("");

  return transliterated
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Ensure uniqueness against a list of existing slugs by appending `-2`, `-3`… */
export function uniqueSlug(base: string, existing: string[]): string {
  const seed = base || "item";
  if (!existing.includes(seed)) return seed;
  let n = 2;
  while (existing.includes(`${seed}-${n}`)) n += 1;
  return `${seed}-${n}`;
}

/** Anchor id for an article heading (used by the table of contents). */
export function headingId(text: string, index: number): string {
  const slug = slugify(text);
  return slug ? `${slug}-${index}` : `section-${index}`;
}
