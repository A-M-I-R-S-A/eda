import { randomBytes, randomUUID } from "node:crypto";

/**
 * Identifier generation. Server-only (`node:crypto`).
 */

/** Opaque primary key. */
export function newId(): string {
  return randomUUID();
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
  return `${Date.now().toString(36)}-${randomBytes(12).toString("hex")}${
    safeExt ? `.${safeExt}` : ""
  }`;
}
