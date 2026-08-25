import "server-only";

import type {
  Appointment,
  ConsultationRequest,
  SessionPayload,
  SiteSettings,
} from "@/types";
import { getSettings, recordSms } from "@/lib/db";
import { REQUEST_STATUS, APPOINTMENT_STATUS } from "@/lib/config/labels";
import { formatJalali } from "@/lib/utils/jalali";
import {
  readCredentials,
  sendTextMessage,
  sendVerificationCode,
} from "./client";
import { createChallenge, generateCode, type OtpPurpose } from "./otp";

/**
 * Everything the application sends by SMS.
 *
 * Three flows, deliberately shaped differently:
 *
 *   1. `sendOtp` — automatic, on the visitor's request, to prove a number.
 *   2. `sendCaseNotification` — never automatic. Staff read the text, edit it
 *      and press send. A message about somebody's legal matter is not
 *      something to fire on a status transition.
 *   3. `notifyAdminOf*` — automatic, to the office's own numbers only.
 *
 * Every attempt is logged, successful or not, so the office can reconcile what
 * was actually delivered against what the provider charged for.
 */

export { MAX_SMS_LENGTH } from "./constants";

export type SmsOutcome = { ok: true } | { ok: false; error: string };

const DISABLED_MESSAGE =
  "ارسال پیامک غیرفعال است. آن را از «تنظیمات › پیامک» فعال کنید.";

const NO_CREDENTIALS_MESSAGE =
  "کلید سامانه پیامک تنظیم نشده است (SMSIR_API_KEY).";

/* -------------------------------------------------------------------------- */
/*  Templates                                                                 */
/* -------------------------------------------------------------------------- */

export interface TemplateVars {
  name?: string;
  code?: string;
  status?: string;
  institution?: string;
  date?: string;
  time?: string;
}

/** Replaces `{placeholder}` tokens; an unknown token is left untouched. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key as keyof TemplateVars];
    return value === undefined || value === "" ? match : value;
  });
}

/** Appends the configured signature unless the body already ends with it. */
export function withSignature(body: string, settings: SiteSettings): string {
  const signature = settings.sms.signature?.trim();
  if (!signature || body.includes(signature)) return body;
  return `${body.trim()}\n${signature}`;
}

/**
 * The prefilled text for the composer on a request screen.
 *
 * Returns an empty string when no template is configured for that status —
 * the composer then simply opens blank rather than inventing wording about
 * somebody's case.
 */
export function requestStatusMessage(
  request: ConsultationRequest,
  status: string,
  settings: SiteSettings,
): string {
  const template = settings.sms.requestStatusTemplates?.[status];
  if (!template) return "";

  return withSignature(
    renderTemplate(template, {
      name: request.fullName,
      code: request.trackingCode,
      status: REQUEST_STATUS[request.status]?.label ?? status,
      institution: settings.institutionName,
    }),
    settings,
  );
}

export function appointmentStatusMessage(
  appointment: Appointment,
  status: string,
  settings: SiteSettings,
): string {
  const template = settings.sms.appointmentStatusTemplates?.[status];
  if (!template) return "";

  return withSignature(
    renderTemplate(template, {
      name: appointment.fullName,
      code: appointment.bookingCode,
      status: APPOINTMENT_STATUS[appointment.status]?.label ?? status,
      institution: settings.institutionName,
      date: formatJalali(appointment.date),
      time: appointment.time,
    }),
    settings,
  );
}

/* -------------------------------------------------------------------------- */
/*  One-time codes                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Issues and sends a verification code.
 *
 * The code is never returned to the caller and never written to the log — the
 * log entry records only that a code was sent.
 */
export async function sendOtp(
  phone: string,
  purpose: OtpPurpose,
): Promise<SmsOutcome> {
  const settings = await getSettings();

  if (!settings.sms.enabled) return { ok: false, error: DISABLED_MESSAGE };

  const credentials = readCredentials();
  if (!credentials) return { ok: false, error: NO_CREDENTIALS_MESSAGE };

  const code = generateCode();
  await createChallenge(phone, purpose, code);

  const result = await sendVerificationCode(phone, code, credentials);

  await recordSms({
    to: phone,
    purpose: "otp",
    // Never the code itself.
    body: "[کد یک‌بارمصرف تأیید شماره]",
    status: result.ok ? "sent" : "failed",
    providerMessageId: result.ok ? result.messageId : undefined,
    error: result.ok ? undefined : result.error,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/* -------------------------------------------------------------------------- */
/*  Case notifications (staff-initiated)                                      */
/* -------------------------------------------------------------------------- */

export interface CaseNotificationInput {
  to: string;
  body: string;
  entityType: "request" | "appointment";
  entityId: string;
  session: SessionPayload;
}

/**
 * Sends a message a staff member composed about a specific record.
 *
 * The sender is recorded on the log entry: for a legal practice, "who told the
 * client what, and when" is part of the case file.
 */
export async function sendCaseNotification(
  input: CaseNotificationInput,
): Promise<SmsOutcome> {
  const settings = await getSettings();

  if (!settings.sms.enabled) return { ok: false, error: DISABLED_MESSAGE };

  const credentials = readCredentials();
  if (!credentials) return { ok: false, error: NO_CREDENTIALS_MESSAGE };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "متن پیامک خالی است." };

  const result = await sendTextMessage([input.to], body, credentials);

  await recordSms({
    to: input.to,
    purpose: "status-update",
    body,
    status: result.ok ? "sent" : "failed",
    providerMessageId: result.ok ? result.messageId : undefined,
    error: result.ok ? undefined : result.error,
    entityType: input.entityType,
    entityId: input.entityId,
    sentById: input.session.sub,
    sentByName: input.session.name,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/* -------------------------------------------------------------------------- */
/*  Office alerts (automatic)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Where office alerts go.
 *
 * Explicit recipients win; otherwise the institution's own mobile number is
 * used, so the feature works as soon as it is switched on.
 */
function alertRecipients(settings: SiteSettings): string[] {
  const configured = settings.sms.adminRecipients?.filter(Boolean) ?? [];
  if (configured.length) return configured;
  return settings.mobile ? [settings.mobile] : [];
}

async function sendAlert(body: string, entityId: string): Promise<void> {
  const settings = await getSettings();

  if (!settings.sms.enabled) return;

  const credentials = readCredentials();
  if (!credentials) return;

  const recipients = alertRecipients(settings);
  if (!recipients.length) return;

  const result = await sendTextMessage(recipients, body, credentials);

  await recordSms({
    to: recipients.join(","),
    purpose: "admin-alert",
    body,
    status: result.ok ? "sent" : "failed",
    providerMessageId: result.ok ? result.messageId : undefined,
    error: result.ok ? undefined : result.error,
    entityId,
  });
}

/**
 * Alerts the office that an enquiry arrived.
 *
 * Never throws and never blocks the visitor: a provider outage must not turn a
 * successfully stored request into an error on the public form.
 */
export async function notifyAdminOfRequest(
  request: ConsultationRequest,
): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.sms.notifyAdminOnRequest) return;

    // No case details — this goes to a phone that may not be the arbitrator's.
    const body = withSignature(
      `درخواست جدید ثبت شد.\nکد پیگیری: ${request.trackingCode}\nمتقاضی: ${request.fullName}\nتماس: ${request.phone}`,
      settings,
    );

    await sendAlert(body, request.id);
  } catch (error) {
    console.error("[sms] admin request alert failed", error);
  }
}

export async function notifyAdminOfAppointment(
  appointment: Appointment,
): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.sms.notifyAdminOnAppointment) return;

    const body = withSignature(
      `رزرو وقت جدید.\nکد: ${appointment.bookingCode}\nمراجع: ${appointment.fullName}\nزمان: ${formatJalali(appointment.date)} ساعت ${appointment.time}`,
      settings,
    );

    await sendAlert(body, appointment.id);
  } catch (error) {
    console.error("[sms] admin appointment alert failed", error);
  }
}

/** True when the deployment could actually send right now. */
export async function smsReady(): Promise<boolean> {
  const settings = await getSettings();
  return settings.sms.enabled && readCredentials() !== null;
}
