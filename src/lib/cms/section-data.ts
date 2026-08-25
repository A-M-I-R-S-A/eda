import type { SectionData, SectionValue } from "@/types";

/**
 * Typed reads over a section's loosely-typed `data` bag.
 *
 * Section values arrive from a generic editor and are persisted as JSON, so a
 * renderer can never assume a field is present or well-typed — an
 * administrator may have cleared it, or the section definition may have gained
 * the field after the record was written. These accessors always return a
 * usable value, which is what keeps the renderers free of defensive noise.
 */

export function str(data: SectionData, key: string, fallback = ""): string {
  const value = data?.[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

export function num(data: SectionData, key: string, fallback = 0): number {
  const value = data?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function bool(data: SectionData, key: string, fallback = false): boolean {
  const value = data?.[key];
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "on" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

/**
 * Repeater rows.
 *
 * Rows carrying an explicit `enabled: false` are dropped here rather than in
 * every renderer — "disable this card" is a library-wide behaviour, not a
 * per-section one. A row with no `enabled` key at all counts as enabled.
 */
export function rows(data: SectionData, key: string): SectionData[] {
  const value = data?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is SectionData =>
      Boolean(row) &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      bool(row as SectionData, "enabled", true),
  );
}

/** Every row, including disabled ones — for the admin editor. */
export function allRows(data: SectionData, key: string): SectionData[] {
  const value = data?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is SectionData =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );
}

/** A link is only rendered when it has both a label and a destination. */
export function link(
  data: SectionData,
  textKey: string,
  urlKey: string,
): { label: string; href: string } | null {
  const label = str(data, textKey);
  const href = str(data, urlKey);
  return label && href ? { label, href } : null;
}

/** Coerces the `columns` select into a real grid class count. */
export function columns(data: SectionData, fallback: 2 | 3 | 4 = 3): 2 | 3 | 4 {
  const value = num(data, "columns", fallback);
  return value === 2 || value === 4 ? value : value === 3 ? 3 : fallback;
}

/** Normalises an arbitrary JSON value into something storable in `data`. */
export function toSectionValue(value: unknown): SectionValue {
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (Array.isArray(value)) {
    return value
      .filter((row) => row && typeof row === "object" && !Array.isArray(row))
      .map((row) => row as SectionData);
  }
  return undefined;
}
