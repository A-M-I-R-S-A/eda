"use server";

import { revalidatePath } from "next/cache";
import { getAppointmentById, getRequestById } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  RATE_LIMITS,
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { MAX_SMS_LENGTH } from "@/lib/sms/constants";
import { sendCaseNotification } from "@/lib/sms/service";
import { audit, guard } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Staff-initiated SMS.
 *
 * Deliberately a separate, explicit action rather than a side effect of
 * changing a status. Two reasons:
 *
 *   • The wording matters. A message about somebody's legal matter goes out
 *     over the institution's name, and the person sending it should have read
 *     the exact text first.
 *   • Not every status change is worth a message, and some warrant a phone
 *     call instead. Coupling the two would send messages nobody chose to send.
 *
 * The recipient is never taken from the form. It is read from the stored
 * record, so a tampered field cannot redirect a case notification to an
 * arbitrary number.
 */

export async function sendRequestSmsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const id = String(formData.get("id") || "");
  const body = String(formData.get("body") || "").trim();

  if (!id) return errorState("درخواست نامعتبر است.");
  if (!body) return errorState("متن پیامک را وارد کنید.");
  if (body.length > MAX_SMS_LENGTH) {
    return errorState(
      `متن پیامک نباید بیشتر از ${MAX_SMS_LENGTH} نویسه باشد.`,
      { body: [`متن پیامک نباید بیشتر از ${MAX_SMS_LENGTH} نویسه باشد.`] },
    );
  }

  const limit = await rateLimit(
    `sms:send:${gate.session.sub}`,
    RATE_LIMITS.smsSend.limit,
    RATE_LIMITS.smsSend.windowMs,
  );
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  try {
    const request = await getRequestById(id);
    if (!request) return errorState("درخواست مورد نظر یافت نشد.");

    const result = await sendCaseNotification({
      to: request.phone,
      body,
      entityType: "request",
      entityId: request.id,
      session: gate.session,
    });

    await audit(gate.session, {
      action: "sms",
      entity: "request",
      entityId: request.id,
      entityLabel: request.trackingCode,
      detail: result.ok ? "sent" : `failed: ${result.error}`,
    });

    revalidatePath(ROUTES.admin.request(id));

    return result.ok
      ? successState(`پیامک به ${request.phone} ارسال شد.`)
      : errorState(result.error);
  } catch (error) {
    console.error("[admin] request sms failed", error);
    return errorState("ارسال پیامک با خطا مواجه شد.");
  }
}

export async function sendAppointmentSmsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const id = String(formData.get("id") || "");
  const body = String(formData.get("body") || "").trim();

  if (!id) return errorState("درخواست نامعتبر است.");
  if (!body) return errorState("متن پیامک را وارد کنید.");
  if (body.length > MAX_SMS_LENGTH) {
    return errorState(
      `متن پیامک نباید بیشتر از ${MAX_SMS_LENGTH} نویسه باشد.`,
      { body: [`متن پیامک نباید بیشتر از ${MAX_SMS_LENGTH} نویسه باشد.`] },
    );
  }

  const limit = await rateLimit(
    `sms:send:${gate.session.sub}`,
    RATE_LIMITS.smsSend.limit,
    RATE_LIMITS.smsSend.windowMs,
  );
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  try {
    const appointment = await getAppointmentById(id);
    if (!appointment) return errorState("نوبت مورد نظر یافت نشد.");

    const result = await sendCaseNotification({
      to: appointment.phone,
      body,
      entityType: "appointment",
      entityId: appointment.id,
      session: gate.session,
    });

    await audit(gate.session, {
      action: "sms",
      entity: "appointment",
      entityId: appointment.id,
      entityLabel: appointment.bookingCode,
      detail: result.ok ? "sent" : `failed: ${result.error}`,
    });

    revalidatePath(ROUTES.admin.appointment(id));

    return result.ok
      ? successState(`پیامک به ${appointment.phone} ارسال شد.`)
      : errorState(result.error);
  } catch (error) {
    console.error("[admin] appointment sms failed", error);
    return errorState("ارسال پیامک با خطا مواجه شد.");
  }
}
