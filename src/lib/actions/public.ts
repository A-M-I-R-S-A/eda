"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  createAppointment,
  createMessage,
  createRequest,
  findAppointmentForTracking,
  findRequestForTracking,
  getArbitratorById,
  getBookedTimes,
  getSettings,
  subscribeToNewsletter,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { resolveConsultationType } from "@/lib/config/labels";
import { verifyCsrfFromForm } from "@/lib/security/csrf";
import {
  MAX_FILES_PER_REQUEST,
  storeUploads,
} from "@/lib/security/upload";
import {
  RATE_LIMITS,
  limitByIp,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { newBookingCode, newTrackingCode } from "@/lib/utils/id";
import {
  appointmentSchema,
  consultationSchema,
  contactSchema,
  newsletterSchema,
  toFieldErrors,
  trackingSchema,
} from "@/lib/validation/schemas";
import { isSlotSelectable } from "@/lib/services/scheduling";
import { phoneVerificationRequired } from "@/lib/sms/constants";
import { verifyProof } from "@/lib/sms/otp";
import {
  notifyAdminOfAppointment,
  notifyAdminOfRequest,
} from "@/lib/sms/service";
import {
  errorState,
  successState,
  type AppointmentReceipt,
  type ConsultationReceipt,
  type FormState,
  type TrackingResult,
} from "./types";

/**
 * Public-facing Server Actions.
 *
 * Every action follows the same five-step contract:
 *   1. CSRF token check
 *   2. IP rate limit
 *   3. schema validation (the same schema the client used)
 *   4. domain rules (slot availability, business hours…)
 *   5. persist + revalidate
 *
 * Steps 1–3 run *before* anything touches storage, so a malformed or hostile
 * submission never reaches the data layer.
 */

const GENERIC_ERROR =
  "ثبت اطلاعات با خطا مواجه شد. لطفاً دوباره تلاش کنید یا با ما تماس بگیرید.";

const VALIDATION_ERROR = "لطفاً خطاهای مشخص‌شده در فرم را برطرف کنید.";

const CSRF_ERROR =
  "اعتبار این فرم منقضی شده است. لطفاً صفحه را تازه‌سازی کرده و دوباره تلاش کنید.";

const UNVERIFIED_PHONE_ERROR =
  "شماره موبایل شما تأیید نشده است. لطفاً کد تأیید را دریافت و وارد کنید.";

/**
 * Confirms the submission carries proof of the one-time-code check.
 *
 * Verification is a setting rather than a constant: an institution that has
 * not bought SMS credit yet still needs a working contact form. When it is
 * switched on the check is mandatory and server-side — the hidden proof field
 * is a signed token bound to this exact number, so it cannot be forged or
 * moved onto a different one.
 */
async function phoneIsVerified(
  formData: FormData,
  phone: string,
  purpose: "consultation" | "appointment",
): Promise<boolean> {
  const settings = await getSettings();
  if (!phoneVerificationRequired(settings.sms)) return true;
  return verifyProof(formData.get("phoneProof"), phone, purpose);
}

/* -------------------------------------------------------------------------- */
/*  Consultation / arbitration request                                        */
/* -------------------------------------------------------------------------- */

export async function submitConsultationRequest(
  _prev: FormState<ConsultationReceipt>,
  formData: FormData,
): Promise<FormState<ConsultationReceipt>> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState(CSRF_ERROR);
  }

  const limit = await limitByIp(
    "consultation",
    RATE_LIMITS.consultation.limit,
    RATE_LIMITS.consultation.windowMs,
  );
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  const parsed = consultationSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    requestType: formData.get("requestType"),
    legalArea: formData.get("legalArea"),
    subject: formData.get("subject"),
    description: formData.get("description"),
    preferredContact: formData.get("preferredContact"),
    preferredWindow: formData.get("preferredWindow"),
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    return errorState(VALIDATION_ERROR, toFieldErrors(parsed.error));
  }

  if (!(await phoneIsVerified(formData, parsed.data.phone, "consultation"))) {
    return errorState(UNVERIFIED_PHONE_ERROR, {
      phone: [UNVERIFIED_PHONE_ERROR],
    });
  }

  // Attachments are validated (type, magic bytes, size) before being written
  // outside the public directory.
  const files = formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length > MAX_FILES_PER_REQUEST) {
    return errorState(VALIDATION_ERROR, {
      attachments: [`حداکثر ${MAX_FILES_PER_REQUEST} فایل قابل بارگذاری است.`],
    });
  }

  const upload = await storeUploads(files);
  if (!upload.ok) {
    return errorState(VALIDATION_ERROR, { attachments: [upload.error.message] });
  }

  try {
    const now = new Date().toISOString();
    const record = await createRequest({
      trackingCode: newTrackingCode(),
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      requestType: parsed.data.requestType,
      legalArea: parsed.data.legalArea,
      subject: parsed.data.subject,
      description: parsed.data.description,
      preferredContact: parsed.data.preferredContact,
      preferredWindow: parsed.data.preferredWindow,
      attachments: upload.attachments,
      status: "submitted",
      consentAccepted: true,
      phoneVerified: true,
      timeline: [{ status: "submitted", at: now }],
      notes: [],
    });

    /**
     * The office alert runs after the response is flushed.
     *
     * The visitor's receipt must not wait on a third-party SMS gateway, and a
     * provider outage must never turn a successfully stored request into an
     * error on the public form.
     */
    after(() => notifyAdminOfRequest(record));

    revalidatePath(ROUTES.admin.requests);
    revalidatePath(ROUTES.admin.root);

    return successState<ConsultationReceipt>(
      "درخواست شما با موفقیت ثبت شد.",
      {
        trackingCode: record.trackingCode,
        createdAt: record.createdAt,
        requestType: record.requestType,
        status: record.status,
        attachmentCount: record.attachments.length,
      },
    );
  } catch (error) {
    console.error("[action] consultation failed", error);
    return errorState(GENERIC_ERROR);
  }
}

/* -------------------------------------------------------------------------- */
/*  Appointment booking                                                       */
/* -------------------------------------------------------------------------- */

export async function submitAppointment(
  _prev: FormState<AppointmentReceipt>,
  formData: FormData,
): Promise<FormState<AppointmentReceipt>> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState(CSRF_ERROR);
  }

  const limit = await limitByIp(
    "appointment",
    RATE_LIMITS.appointment.limit,
    RATE_LIMITS.appointment.windowMs,
  );
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  const parsed = appointmentSchema.safeParse({
    consultationType: formData.get("consultationType"),
    arbitratorId: formData.get("arbitratorId"),
    date: formData.get("date"),
    time: formData.get("time"),
    meetingMode: formData.get("meetingMode"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    return errorState(VALIDATION_ERROR, toFieldErrors(parsed.error));
  }

  const input = parsed.data;

  if (!(await phoneIsVerified(formData, input.phone, "appointment"))) {
    return errorState(UNVERIFIED_PHONE_ERROR, {
      phone: [UNVERIFIED_PHONE_ERROR],
    });
  }

  try {
    const arbitrator = await getArbitratorById(input.arbitratorId);
    if (!arbitrator || !arbitrator.published || !arbitrator.bookable) {
      return errorState(VALIDATION_ERROR, {
        arbitratorId: ["داور انتخاب‌شده در حال حاضر پذیرش وقت ندارد."],
      });
    }

    /**
     * Meeting types are CMS records, so the submitted key is resolved against
     * the *current* configuration. A booking for a type that has since been
     * removed or disabled is refused rather than stored with a dangling key.
     */
    const settings = await getSettings();

    if (!settings.appointments.enabled) {
      return errorState(
        "رزرو آنلاین وقت در حال حاضر غیرفعال است. لطفاً تلفنی تماس بگیرید.",
      );
    }

    const type = resolveConsultationType(
      input.consultationType,
      settings.appointments.types,
    );

    if (!type || !type.enabled) {
      return errorState(VALIDATION_ERROR, {
        consultationType: ["نوع جلسه انتخاب‌شده در دسترس نیست."],
      });
    }

    if (!type.modes.includes(input.meetingMode)) {
      return errorState(VALIDATION_ERROR, {
        meetingMode: ["نوع برگزاری انتخاب‌شده برای این نوع مشاوره در دسترس نیست."],
      });
    }

    // Re-check the slot on the server: the client's list may be stale, and two
    // visitors can reach the same slot at the same moment.
    const booked = await getBookedTimes(arbitrator.id, input.date);
    const check = isSlotSelectable(
      input.date,
      input.time,
      booked,
      settings.appointments,
    );

    if (!check.ok) {
      return errorState(check.message, { time: [check.message] });
    }

    const now = new Date().toISOString();
    const record = await createAppointment({
      bookingCode: newBookingCode(),
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      consultationType: input.consultationType,
      consultationTypeLabel: type.title,
      arbitratorId: arbitrator.id,
      arbitratorName: arbitrator.fullName,
      date: input.date,
      time: input.time,
      durationMinutes: type.durationMinutes,
      meetingMode: input.meetingMode,
      subject: input.subject,
      // Whether a new booking needs review is an operational policy, so it
      // comes from the CMS rather than from a constant here.
      status: settings.appointments.requireApproval ? "pending" : "confirmed",
      consentAccepted: true,
      phoneVerified: true,
      timeline: [
        {
          status: settings.appointments.requireApproval ? "pending" : "confirmed",
          at: now,
        },
      ],
      notes: [],
    });

    after(() => notifyAdminOfAppointment(record));

    revalidatePath(ROUTES.admin.appointments);
    revalidatePath(ROUTES.admin.root);

    return successState<AppointmentReceipt>("رزرو شما با موفقیت ثبت شد.", {
      bookingCode: record.bookingCode,
      date: record.date,
      time: record.time,
      durationMinutes: record.durationMinutes,
      consultationType: record.consultationType,
      meetingMode: record.meetingMode,
      arbitratorName: record.arbitratorName,
      status: record.status,
    });
  } catch (error) {
    console.error("[action] appointment failed", error);
    return errorState(GENERIC_ERROR);
  }
}

/** Returns the free slots for an arbitrator on a date (called by the wizard). */
export async function fetchAvailableSlots(
  arbitratorId: string,
  date: string,
): Promise<{ time: string; available: boolean }[]> {
  if (!/^[\w-]{1,64}$/.test(arbitratorId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return [];
  }

  const { buildDaySlots } = await import("@/lib/services/scheduling");
  const [booked, settings] = await Promise.all([
    getBookedTimes(arbitratorId, date),
    getSettings(),
  ]);
  return buildDaySlots(date, booked, settings.appointments);
}

/* -------------------------------------------------------------------------- */
/*  Contact message                                                           */
/* -------------------------------------------------------------------------- */

export async function submitContactMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState(CSRF_ERROR);
  }

  const limit = await limitByIp(
    "contact",
    RATE_LIMITS.contact.limit,
    RATE_LIMITS.contact.windowMs,
  );
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  const parsed = contactSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return errorState(VALIDATION_ERROR, toFieldErrors(parsed.error));
  }

  try {
    await createMessage({ ...parsed.data, status: "new", notes: [] });
    revalidatePath(ROUTES.admin.messages);
    revalidatePath(ROUTES.admin.root);

    return successState(
      "پیام شما دریافت شد. در روزهای کاری با شما تماس می‌گیریم.",
    );
  } catch (error) {
    console.error("[action] contact failed", error);
    return errorState(GENERIC_ERROR);
  }
}

/* -------------------------------------------------------------------------- */
/*  Tracking                                                                  */
/* -------------------------------------------------------------------------- */

export async function lookupTracking(
  _prev: FormState<TrackingResult>,
  formData: FormData,
): Promise<FormState<TrackingResult>> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState(CSRF_ERROR);
  }

  // Tighter limit: this endpoint answers "does this code exist".
  const limit = await limitByIp(
    "tracking",
    RATE_LIMITS.tracking.limit,
    RATE_LIMITS.tracking.windowMs,
  );
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  const parsed = trackingSchema.safeParse({
    code: formData.get("code"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return errorState(VALIDATION_ERROR, toFieldErrors(parsed.error));
  }

  const { code, phone } = parsed.data;

  try {
    // Both the code AND the submitting phone number must match: a leaked code
    // alone must never reveal case details.
    if (code.startsWith("RZ-")) {
      const appointment = await findAppointmentForTracking(code, phone);
      if (appointment) {
        return successState<TrackingResult>("رزرو شما پیدا شد.", {
          kind: "appointment",
          appointment,
        });
      }
    } else {
      const request = await findRequestForTracking(code, phone);
      if (request) {
        return successState<TrackingResult>("درخواست شما پیدا شد.", {
          kind: "request",
          request,
        });
      }
    }

    return errorState(
      "موردی با این کد پیگیری و شماره موبایل یافت نشد. لطفاً اطلاعات واردشده را بررسی کنید.",
    );
  } catch (error) {
    console.error("[action] tracking failed", error);
    return errorState(GENERIC_ERROR);
  }
}

/* -------------------------------------------------------------------------- */
/*  Newsletter                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Newsletter sign-up.
 *
 * Always answers as though it succeeded, even for an address that is already
 * on the list. Reporting "you are already subscribed" would turn the form into
 * an oracle for checking whether a given person is a client of this
 * institution — which is exactly the kind of thing a legal practice must not
 * leak. The repository de-duplicates server-side.
 */
export async function subscribeNewsletterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState(CSRF_ERROR);
  }

  const limit = await limitByIp(
    "newsletter",
    RATE_LIMITS.newsletter.limit,
    RATE_LIMITS.newsletter.windowMs,
  );
  if (!limit.allowed) return errorState(rateLimitMessage(limit.retryAfter));

  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") ?? "",
  });

  if (!parsed.success) {
    return errorState(VALIDATION_ERROR, toFieldErrors(parsed.error));
  }

  try {
    await subscribeToNewsletter(parsed.data.email, {
      name: parsed.data.name || undefined,
      source: String(formData.get("source") || "footer"),
    });

    revalidatePath(ROUTES.admin.newsletter);
    return successState("ثبت شد. از این پس تازه‌ترین مطالب برای شما ارسال می‌شود.");
  } catch (error) {
    console.error("[action] newsletter failed", error);
    return errorState(GENERIC_ERROR);
  }
}
