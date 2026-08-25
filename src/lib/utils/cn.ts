type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

/**
 * Minimal class-name joiner. Deliberately dependency-free — the project ships
 * no runtime utility libraries so the client bundle stays small.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (
      typeof input === "string" ||
      typeof input === "number" ||
      typeof input === "bigint"
    ) {
      out.push(String(input));
    } else if (typeof input === "boolean") {
      // `true` carries no class name; `false` was already skipped above.
      continue;
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      for (const key in input) {
        if (input[key]) out.push(key);
      }
    }
  }

  return out.join(" ");
}
