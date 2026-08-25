/**
 * SMS constants shared by client and server.
 *
 * Deliberately free of `server-only` and of any import that reaches the
 * database or the provider. The admin composer is a client component and needs
 * the length cap; importing it from `./service` pulled `mysql2` into the
 * browser bundle and broke the build.
 */

/** Persian SMS is UCS-2: 70 characters per part, so this is roughly six parts. */
export const MAX_SMS_LENGTH = 420;

/** Characters in a single UCS-2 part, and per part once a message splits. */
export const SMS_SINGLE_PART = 70;
export const SMS_MULTI_PART = 67;

/** How many parts — and therefore how much credit — a message will cost. */
export function smsParts(length: number): number {
  if (length <= 0) return 0;
  if (length <= SMS_SINGLE_PART) return 1;
  return Math.ceil(length / SMS_MULTI_PART);
}

/**
 * Whether public forms must carry a verified phone number.
 *
 * Both switches have to be on. Requiring verification while sending is
 * disabled would leave the consultation and booking forms impossible to
 * submit — the visitor is asked for a code that can never arrive — and the
 * shipped defaults are exactly that combination, so this is not hypothetical.
 * A form without the check is a far smaller problem than a form nobody can
 * complete.
 */
export function phoneVerificationRequired(sms: {
  enabled: boolean;
  requirePhoneVerification: boolean;
}): boolean {
  return sms.enabled && sms.requirePhoneVerification;
}
