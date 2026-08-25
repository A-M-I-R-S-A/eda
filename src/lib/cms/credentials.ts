import type { CredentialEntry } from "@/types";

/**
 * Credential lists as editable text.
 *
 * Education and professional background are edited as one line per entry in
 * `عنوان | نهاد | دوره` form. Three inputs per row would be more "correct" and
 * much slower to fill in; a single textarea survives copy-and-paste from a CV,
 * which is how these lists actually get written.
 */

export function parseCredentials(value: string): CredentialEntry[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const [title = "", institution = "", period = ""] = line
        .split("|")
        .map((part) => part.trim());
      return { title, institution, period };
    })
    .filter((entry) => entry.title);
}

export function serializeCredentials(entries: CredentialEntry[] = []): string {
  return entries
    .map((entry) =>
      [entry.title, entry.institution, entry.period].filter(Boolean).join(" | "),
    )
    .join("\n");
}

export const CREDENTIAL_HINT =
  "هر مورد در یک خط، با قالب: عنوان | نهاد | دوره — مثال: دکتری حقوق خصوصی | دانشگاه تهران | ۱۳۹۰ تا ۱۳۹۵";
