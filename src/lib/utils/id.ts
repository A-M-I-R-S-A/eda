/**
 * Identifier generation.
 *
 * Built on the Web Crypto globals rather than `node:crypto`, because these
 * helpers are genuinely needed on both sides: the section, navigation and
 * footer editors mint a `newId()` for each row the administrator adds, in the
 * browser, before anything is submitted.
 *
 * `globalThis.crypto` is standard in Node 20+ and in every browser, and
 * `getRandomValues` is the same CSPRNG guarantee as `randomBytes` — so this
 * costs nothing in strength and removes a Node-only import from the client
 * bundle. Turbopack tolerated that import by dropping it during tree-shaking;
 * a webpack build refuses it outright, which is the correct reaction.
 */

/** Fills a byte array from the platform's cryptographic RNG. */
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Opaque primary key. */
export function newId(): string {
  /**
   * `randomUUID` is only exposed in a secure context. The admin panel is
   * HTTPS-only, so this holds in practice — but a plain-HTTP staging origin
   * would otherwise throw here, which is a poor way to discover the problem.
   */
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Alphabet for human-facing codes. Deliberately excludes characters that are
 * easy to misread aloud over the phone: I, O, 0, 1, L, U, V.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTWXYZ23456789";

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/** Tracking code for consultation / arbitration requests: `DR-7K3MQX`. */
export function newTrackingCode(): string {
  return `DR-${randomCode(6)}`;
}

/** Booking code for appointments: `RZ-8KD31M`. */
export function newBookingCode(): string {
  return `RZ-${randomCode(6)}`;
}

/** Collision-resistant, non-guessable stored filename for uploads. */
export function newUploadName(extension: string): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const suffix = Array.from(randomBytes(12), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `${Date.now().toString(36)}-${suffix}${safeExt ? `.${safeExt}` : ""}`;
}
