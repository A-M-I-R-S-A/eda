import "server-only";

import type { SessionPayload, SocialLink, SocialPlatform } from "@/types";
import type { Permission } from "@/lib/auth/permissions";
import { getAdminSession, getRequestIp } from "@/lib/auth/current-user";
import { recordAudit, type AuditInput } from "@/lib/db";
import { verifyCsrfFromForm } from "@/lib/security/csrf";
import { errorState, type FormState } from "./types";

/**
 * The gate every admin Server Action runs before it touches data.
 *
 * Three checks, always in this order:
 *   1. an authenticated staff session that holds the required capability;
 *   2. a valid CSRF token;
 *   3. (in the action itself) zod validation.
 *
 * Capabilities rather than role ranks — see `@/lib/auth/permissions`. An
 * editor may publish a page and must not read an appointment; a manager is the
 * mirror image. Neither is "higher" than the other.
 */

export const MESSAGES = {
  csrf:
    "اعتبار این فرم منقضی شده است. صفحه را تازه‌سازی کرده و دوباره تلاش کنید.",
  forbidden: "شما مجوز انجام این عملیات را ندارید.",
  generic: "انجام عملیات با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
  validation: "لطفاً خطاهای مشخص‌شده در فرم را برطرف کنید.",
  notFound: "مورد درخواستی یافت نشد.",
  invalid: "درخواست نامعتبر است.",
} as const;

/**
 * `FormState<never>` rather than `FormState<undefined>` so a failed gate can be
 * returned directly from an action that declares a payload type.
 */
export type Guarded =
  | { ok: true; session: SessionPayload }
  | { ok: false; state: FormState<never> };

export async function guard(
  formData: FormData,
  permission: Permission,
): Promise<Guarded> {
  const session = await getAdminSession(permission);
  if (!session) return { ok: false, state: errorState<never>(MESSAGES.forbidden) };

  if (!(await verifyCsrfFromForm(formData))) {
    return { ok: false, state: errorState<never>(MESSAGES.csrf) };
  }

  return { ok: true, session };
}

/* -------------------------------------------------------------------------- */
/*  FormData readers                                                          */
/* -------------------------------------------------------------------------- */

/** Checkbox inputs post `"on"`; an unchecked box posts nothing at all. */
export function bool(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

export function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function list(formData: FormData, name: string): string[] {
  return formData.getAll(name).map(String);
}

/**
 * Reads parallel arrays of inputs into rows.
 *
 * Repeating field groups (navigation items, working hours, social links) post
 * one array per column. Zipping them by index is what turns
 * `label[]` + `href[]` back into `{ label, href }[]`.
 */
export function rows<T extends Record<string, string>>(
  formData: FormData,
  fields: (keyof T & string)[],
): T[] {
  const columns = fields.map((field) => formData.getAll(field).map(String));
  const length = Math.max(0, ...columns.map((column) => column.length));

  return Array.from({ length }, (_, index) => {
    const row = {} as T;
    fields.forEach((field, columnIndex) => {
      row[field] = (columns[columnIndex][index] ?? "") as T[keyof T & string];
    });
    return row;
  });
}

/* -------------------------------------------------------------------------- */
/*  Audit                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Writes an audit entry for the current actor.
 *
 * Never throws — a failed log line must not roll back the operation the
 * administrator actually asked for.
 */
export async function audit(
  session: SessionPayload,
  entry: Omit<AuditInput, "actorId" | "actorName" | "actorRole" | "ip">,
): Promise<void> {
  await recordAudit({
    ...entry,
    actorId: session.sub,
    actorName: session.name,
    actorRole: session.role,
    ip: await getRequestIp(),
  });
}

/* -------------------------------------------------------------------------- */
/*  Social links                                                              */
/* -------------------------------------------------------------------------- */

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "linkedin",
  "instagram",
  "telegram",
  "x",
  "whatsapp",
  "aparat",
  "youtube",
  "facebook",
  "website",
];

/**
 * Reads the social-links repeater out of a settings form.
 *
 * A link without a label or an absolute URL is dropped rather than stored: it
 * would otherwise render as a dead icon in the footer of every page.
 */
export function readSocialLinks(formData: FormData): SocialLink[] {
  return rows<Record<string, string>>(formData, [
    "socialPlatform",
    "socialLabel",
    "socialUrl",
  ])
    .map((row) => ({
      platform: (SOCIAL_PLATFORMS.includes(row.socialPlatform as SocialPlatform)
        ? row.socialPlatform
        : "website") as SocialPlatform,
      label: (row.socialLabel ?? "").trim().slice(0, 60),
      url: (row.socialUrl ?? "").trim(),
    }))
    .filter((social) => social.label && /^https?:\/\//.test(social.url))
    .slice(0, 10);
}
