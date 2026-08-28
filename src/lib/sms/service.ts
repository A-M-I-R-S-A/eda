import "server-only";

import type {
  Appointment,
  ConsultationRequest,
  SessionPayload,
  SiteSettings,
} from "@/types";
import { getSettings, recordSms } from "@/lib/db";
import {
  readCredentials,
  sendTemplateMessage,
  sendVerificationCode,
} from "./client";
import { createChallenge, generateCode, type OtpPurpose } from "./otp";

/**
 * Everything the application sends by SMS.
 *
 * Three flows, all through registered sms.ir templates — the provider holds
 * the wording and the API supplies only parameter values:
 *
 *   1. `sendOtp` — automatic, on the visitor's request, to prove a number.
 *      One parameter: the code.
 *   2. `sendStatusUpdate` — never automatic. Staff press send on the record.
 *      One parameter: the tracking or booking code.
 *   3. `notifyStaffOf*` — automatic, to the office's own numbers only.
 *      Two parameters: the staff member's name and the code.
 *
 * Every attempt is logged, successful or not, so the office can reconcile what
 * was delivered against what the provider charged for.
 */

export type SmsOutcome = { ok: true } | { ok: false; error: string };

const DISABLED_MESSAGE =
  "ارسال پیامک غیرفعال است. آن را از «تنظیمات › پیامک» فعال کنید.";

const NO_CREDENTIALS_MESSAGE =
  "کلید سامانه پیامک تنظیم نشده است (SMSIR_API_KEY).";

const NO_TEMPLATE_MESSAGE =
  "شناسه قالب پیامک در «تنظیمات › پیامک» وارد نشده است.";

/**
 * What the log records instead of a message body.
 *
 * There is no body to record: the text lives at the provider. Storing the
 * template id and the values actually sent is both what we know and what is
 * useful when reconciling an invoice.
 */
function describe(templateId: string, values: string[]): string {
  return `[قالب ${templateId}] ${values.join(" — ")}`;
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
/*  Status update to the client (staff-initiated)                             */
/* -------------------------------------------------------------------------- */

export interface StatusUpdateInput {
  to: string;
  /** Tracking code for a request, booking code for an appointment. */
  code: string;
  entityType: "request" | "appointment";
  entityId: string;
  session: SessionPayload;
}

/**
 * Sends the "your case has been updated" template to a client.
 *
 * Deliberately an explicit action rather than a side effect of changing a
 * status: not every transition is worth a message, and some warrant a phone
 * call instead. Coupling the two would send messages nobody chose to send.
 *
 * The recipient and the code both come from the stored record, never from the
 * form, so nothing in the admin UI can redirect a case notification to an
 * arbitrary number or misreport a code.
 */
export async function sendStatusUpdate(
  input: StatusUpdateInput,
): Promise<SmsOutcome> {
  const settings = await getSettings();

  if (!settings.sms.enabled) return { ok: false, error: DISABLED_MESSAGE };

  const credentials = readCredentials();
  if (!credentials) return { ok: false, error: NO_CREDENTIALS_MESSAGE };

  const templateId = settings.sms.updateTemplateId?.trim();
  if (!templateId) return { ok: false, error: NO_TEMPLATE_MESSAGE };

  const result = await sendTemplateMessage(
    input.to,
    Number(templateId),
    [{ name: settings.sms.updateCodeParam || "CODE", value: input.code }],
    credentials,
  );

  await recordSms({
    to: input.to,
    purpose: "status-update",
    body: describe(templateId, [input.code]),
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
/*  Staff alerts (automatic)                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Alerts each configured staff member that new work arrived.
 *
 * Sent one message per recipient rather than one to many, because the template
 * greets the person by name — a shared send could not do that.
 */
async function alertStaff(
  code: string,
  entityId: string,
  settings: SiteSettings,
): Promise<void> {
  const credentials = readCredentials();
  if (!credentials) return;

  const templateId = settings.sms.staffTemplateId?.trim();
  if (!templateId) return;

  const recipients = (settings.sms.staffRecipients ?? []).filter(
    (person) => person.phone,
  );
  if (!recipients.length) return;

  const nameParam = settings.sms.staffNameParam || "NAME";
  const codeParam = settings.sms.staffCodeParam || "CODE";

  for (const person of recipients) {
    const result = await sendTemplateMessage(
      person.phone,
      Number(templateId),
      [
        { name: nameParam, value: person.name || "همکار" },
        { name: codeParam, value: code },
      ],
      credentials,
    );

    await recordSms({
      to: person.phone,
      purpose: "admin-alert",
      body: describe(templateId, [person.name || "همکار", code]),
      status: result.ok ? "sent" : "failed",
      providerMessageId: result.ok ? result.messageId : undefined,
      error: result.ok ? undefined : result.error,
      entityId,
    });
  }
}

/**
 * Alerts the office that an enquiry arrived.
 *
 * Never throws and never blocks the visitor: a provider outage must not turn a
 * successfully stored request into an error on the public form.
 */
export async function notifyStaffOfRequest(
  request: ConsultationRequest,
): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.sms.enabled || !settings.sms.notifyStaffOnRequest) return;
    await alertStaff(request.trackingCode, request.id, settings);
  } catch (error) {
    console.error("[sms] staff request alert failed", error);
  }
}

export async function notifyStaffOfAppointment(
  appointment: Appointment,
): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.sms.enabled || !settings.sms.notifyStaffOnAppointment) return;
    await alertStaff(appointment.bookingCode, appointment.id, settings);
  } catch (error) {
    console.error("[sms] staff appointment alert failed", error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Readiness                                                                 */
/* -------------------------------------------------------------------------- */

/** True when a client status update could actually be sent right now. */
export async function statusUpdateReady(): Promise<boolean> {
  const settings = await getSettings();
  return (
    settings.sms.enabled &&
    Boolean(settings.sms.updateTemplateId?.trim()) &&
    readCredentials() !== null
  );
}

/** Explains, in Persian, why sending is unavailable — or `null` when it is. */
export async function statusUpdateBlockedReason(): Promise<string | null> {
  const settings = await getSettings();
  if (!settings.sms.enabled) return DISABLED_MESSAGE;
  if (!readCredentials()) return NO_CREDENTIALS_MESSAGE;
  if (!settings.sms.updateTemplateId?.trim()) return NO_TEMPLATE_MESSAGE;
  return null;
}
