/**
 * The hidden input name carrying the CSRF token.
 *
 * Split out of `csrf.ts` because that module is `server-only` — client form
 * components need the field name but must never pull in the signing code.
 */
export const CSRF_FIELD = "csrfToken";
