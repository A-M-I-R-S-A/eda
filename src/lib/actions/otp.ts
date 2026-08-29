"use server";

import { verifyCsrfFromForm } from "@/lib/security/csrf";
import {
  RATE_LIMITS,
  getClientIp,
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { sendOtp } from "@/lib/sms/service";
import {
  OTP_TTL_SECONDS,
  issueProof,
  secondsRemaining,
  verifyChallenge,
  type OtpPurpose,
} from "@/lib/sms/otp";
import { mobileSchema } from "@/lib/validation/schemas";
import { errorState, successState, type FormState } from "./types";

/**
 * Public phone-verification actions.
 *
 * Both are rate-limited on two axes — the caller's IP *and* the number being
 * targeted. Limiting by IP alone would let one client walk a list of numbers;
 * limiting by number alone would let one client hammer from a botnet. Sending
 * a code costs real money and rings somebody's actual phone, so the send limit
 * is deliberately the tightest in the application.
 */

const CSRF_ERROR =
  "اعتبار این فرم منقضی شده است. لطفاً صفحه را تازه‌سازی کرده و دوباره تلاش کنید.";

const PURPOSES: OtpPurpose[] = ["appointment"];

function readPurpose(value: FormDataEntryValue | null): OtpPurpose | null {
  return typeof value === "string" && PURPOSES.includes(value as OtpPurpose)
    ? (value as OtpPurpose)
    : null;
}

export interface OtpSendPayload {
  /** Seconds the visitor must wait before the code can be resent. */
  retryAfter: number;
  /** Echoed back so the client can tell which number this result belongs to. */
  phone: string;
}

export interface OtpVerifyPayload {
  /** Signed proof the submitting form posts back with the request. */
  proof: string;
  phone: string;
}

/* -------------------------------------------------------------------------- */
/*  Send                                                                      */
/* -------------------------------------------------------------------------- */

export async function requestPhoneOtpAction(
  _prev: FormState<OtpSendPayload>,
  formData: FormData,
): Promise<FormState<OtpSendPayload>> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState<OtpSendPayload>(CSRF_ERROR);
  }

  const purpose = readPurpose(formData.get("purpose"));
  if (!purpose) return errorState<OtpSendPayload>("درخواست نامعتبر است.");

  const parsed = mobileSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return errorState<OtpSendPayload>("شماره موبایل معتبر نیست.", {
      phone: [parsed.error.issues[0]?.message ?? "شماره موبایل معتبر نیست."],
    });
  }

  const phone = parsed.data;
  const ip = await getClientIp();

  const [byIp, byPhone] = await Promise.all([
    rateLimit(`otp:send:ip:${ip}`, RATE_LIMITS.otpSend.limit, RATE_LIMITS.otpSend.windowMs),
    rateLimit(
      `otp:send:phone:${phone}`,
      RATE_LIMITS.otpSend.limit,
      RATE_LIMITS.otpSend.windowMs,
    ),
  ]);

  if (!byIp.allowed) return errorState<OtpSendPayload>(rateLimitMessage(byIp.retryAfter));
  if (!byPhone.allowed) {
    return errorState<OtpSendPayload>(rateLimitMessage(byPhone.retryAfter));
  }

  /**
   * A code that is still live is not replaced.
   *
   * Otherwise "resend" would be a way to keep a fresh code arriving forever,
   * and the visitor would be typing a code that had just been superseded.
   */
  const remaining = await secondsRemaining(phone, purpose);
  if (remaining > 0) {
    return successState<OtpSendPayload>(
      "کد قبلی هنوز معتبر است. لطفاً همان کد را وارد کنید.",
      { retryAfter: remaining, phone },
    );
  }

  const result = await sendOtp(phone, purpose);

  if (!result.ok) {
    console.error("[otp] send failed:", result.error);
    return errorState<OtpSendPayload>(
      "ارسال کد تأیید ممکن نشد. لطفاً کمی بعد دوباره تلاش کنید.",
    );
  }

  return successState<OtpSendPayload>("کد تأیید به شماره شما ارسال شد.", {
    retryAfter: OTP_TTL_SECONDS,
    phone,
  });
}

/* -------------------------------------------------------------------------- */
/*  Verify                                                                    */
/* -------------------------------------------------------------------------- */

export async function verifyPhoneOtpAction(
  _prev: FormState<OtpVerifyPayload>,
  formData: FormData,
): Promise<FormState<OtpVerifyPayload>> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState<OtpVerifyPayload>(CSRF_ERROR);
  }

  const purpose = readPurpose(formData.get("purpose"));
  if (!purpose) return errorState<OtpVerifyPayload>("درخواست نامعتبر است.");

  const parsed = mobileSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return errorState<OtpVerifyPayload>("شماره موبایل معتبر نیست.");
  }

  const phone = parsed.data;
  const raw = formData.get("code");
  const code = typeof raw === "string" ? raw.replace(/\D/g, "") : "";

  if (code.length !== 6) {
    return errorState<OtpVerifyPayload>("کد تأیید باید ۶ رقم باشد.", {
      code: ["کد تأیید باید ۶ رقم باشد."],
    });
  }

  const ip = await getClientIp();
  const limit = await rateLimit(
    `otp:verify:${ip}:${phone}`,
    RATE_LIMITS.otpVerify.limit,
    RATE_LIMITS.otpVerify.windowMs,
  );
  if (!limit.allowed) {
    return errorState<OtpVerifyPayload>(rateLimitMessage(limit.retryAfter));
  }

  const outcome = await verifyChallenge(phone, purpose, code);

  if (!outcome.ok) {
    const message =
      outcome.reason === "expired"
        ? "کد تأیید منقضی شده است. لطفاً کد جدیدی درخواست کنید."
        : outcome.reason === "exhausted"
          ? "تعداد تلاش‌های مجاز به پایان رسید. لطفاً کد جدیدی درخواست کنید."
          : "کد واردشده صحیح نیست.";

    return errorState<OtpVerifyPayload>(message, { code: [message] });
  }

  return successState<OtpVerifyPayload>("شماره شما تأیید شد.", {
    proof: await issueProof(phone, purpose),
    phone,
  });
}
