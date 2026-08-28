"use server";

import { revalidatePath } from "next/cache";
import { getAppointmentById, getRequestById } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  RATE_LIMITS,
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { sendStatusUpdate } from "@/lib/sms/service";
import { audit, guard } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Staff-initiated status notifications.
 *
 * There is no message body here, and no field for one. sms.ir sends through
 * templates registered in its own panel; the API supplies parameter values
 * only. The single parameter is the record's own tracking or booking code,
 * read from storage — so nothing submitted from the browser can redirect a
 * case notification to another number or misreport a code.
 *
 * Kept separate from the status-change action on purpose: not every transition
 * warrants a message, and some warrant a phone call. Coupling them would send
 * messages nobody chose to send.
 */

async function throttle(actorId: string) {
  return rateLimit(
    `sms:send:${actorId}`,
    RATE_LIMITS.smsSend.limit,
    RATE_LIMITS.smsSend.windowMs,
  );
}

export async function sendRequestSmsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const id = String(formData.get("id") || "");
  if (!id) return errorState("درخواست نامعتبر است.");

  const limit = await throttle(gate.session.sub);
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  try {
    const request = await getRequestById(id);
    if (!request) return errorState("درخواست مورد نظر یافت نشد.");

    const result = await sendStatusUpdate({
      to: request.phone,
      code: request.trackingCode,
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
      ? successState(`پیامک به‌روزرسانی به ${request.phone} ارسال شد.`)
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
  if (!id) return errorState("درخواست نامعتبر است.");

  const limit = await throttle(gate.session.sub);
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  try {
    const appointment = await getAppointmentById(id);
    if (!appointment) return errorState("نوبت مورد نظر یافت نشد.");

    const result = await sendStatusUpdate({
      to: appointment.phone,
      code: appointment.bookingCode,
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
      ? successState(`پیامک به‌روزرسانی به ${appointment.phone} ارسال شد.`)
      : errorState(result.error);
  } catch (error) {
    console.error("[admin] appointment sms failed", error);
    return errorState("ارسال پیامک با خطا مواجه شد.");
  }
}
