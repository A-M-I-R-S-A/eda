"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  requestPhoneOtpAction,
  verifyPhoneOtpAction,
  type OtpSendPayload,
  type OtpVerifyPayload,
} from "@/lib/actions/otp";
import { idleState, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { digitsOnly, fa } from "@/lib/utils/persian";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

/**
 * Mobile-number verification by one-time code.
 *
 * Two exports, because the two public forms are shaped differently:
 *
 *   • `PhoneChallenge` — the send/verify exchange on its own, for a caller
 *     that already owns the phone input (the booking wizard keeps every value
 *     in its own step state).
 *   • `PhoneVerification` — the input and the exchange together, for the
 *     ordinary single-page consultation form.
 *
 * ── Why not a nested form ─────────────────────────────────────────────────
 * Both live *inside* an outer `<form>`, and HTML forbids nesting. The actions
 * are therefore dispatched programmatically with a hand-built `FormData`, so
 * the page keeps a single form and still submits without client JavaScript.
 *
 * ── Degradation without JS ────────────────────────────────────────────────
 * A challenge/response exchange cannot run without scripting. The submission
 * is refused server-side and the visitor is told plainly, rather than the form
 * appearing to work and the enquiry being dropped.
 */

/* ========================================================================== */
/*  Challenge                                                                 */
/* ========================================================================== */

export interface PhoneChallengeProps {
  csrfToken: string;
  purpose: "consultation" | "appointment";
  /** The number to verify, owned by the caller. */
  phone: string;
  /**
   * Receives the signed proof on success and `""` whenever it is invalidated.
   * Must be referentially stable — it drives an effect.
   */
  onProof: (proof: string) => void;
}

export function PhoneChallenge({
  csrfToken,
  purpose,
  phone,
  onProof,
}: PhoneChallengeProps) {
  const codeRef = useRef<HTMLInputElement>(null);

  const [sendState, dispatchSend, sending] = useActionState<
    FormState<OtpSendPayload>,
    FormData
  >(requestPhoneOtpAction, idleState as FormState<OtpSendPayload>);

  const [verifyState, dispatchVerify, verifying] = useActionState<
    FormState<OtpVerifyPayload>,
    FormData
  >(verifyPhoneOtpAction, idleState as FormState<OtpVerifyPayload>);

  const normalised = digitsOnly(phone);
  const validShape = /^09\d{9}$/.test(normalised);

  /**
   * Stage is derived from the two action results, not mirrored into state.
   *
   * Both results carry the number they belong to, so comparing against the
   * current one handles editing the field for free: type a different number
   * and the component is back to "collect" with no proof, because the proof
   * that exists was issued for a number this no longer is.
   */
  const verifiedPhone =
    verifyState.status === "success" ? verifyState.payload?.phone : undefined;
  const verified = Boolean(verifiedPhone) && verifiedPhone === normalised;

  const sent =
    sendState.status === "success" && sendState.payload?.phone === normalised;

  const proof = verified ? (verifyState.payload?.proof ?? "") : "";

  /* -- resend countdown ------------------------------------------------- */

  /**
   * Adjusted during render when a new send result arrives, which is React's
   * documented alternative to synchronising state in an effect.
   */
  const [seenSend, setSeenSend] = useState(sendState.submissionId);
  const [countdown, setCountdown] = useState(0);

  if (sendState.submissionId !== seenSend) {
    setSeenSend(sendState.submissionId);
    setCountdown(
      sendState.status === "success" ? (sendState.payload?.retryAfter ?? 0) : 0,
    );
  }

  /**
   * Ticks down from the timer callback rather than from a clock read during
   * render, which would be impure. Drift while the tab is backgrounded does
   * not matter: this is a courtesy cooldown on the button, and the real limit
   * is enforced server-side on every send.
   */
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  /* -- external notifications ------------------------------------------- */

  useEffect(() => {
    onProof(proof);
  }, [proof, onProof]);

  useEffect(() => {
    if (sent && !verified) codeRef.current?.focus();
  }, [sent, verified]);

  /* -- handlers ---------------------------------------------------------- */

  const send = useCallback(() => {
    const data = new FormData();
    data.set(CSRF_FIELD, csrfToken);
    data.set("purpose", purpose);
    data.set("phone", normalised);
    startTransition(() => dispatchSend(data));
  }, [csrfToken, dispatchSend, normalised, purpose]);

  const verify = useCallback(() => {
    const data = new FormData();
    data.set(CSRF_FIELD, csrfToken);
    data.set("purpose", purpose);
    data.set("phone", normalised);
    data.set("code", codeRef.current?.value ?? "");
    startTransition(() => dispatchVerify(data));
  }, [csrfToken, dispatchVerify, normalised, purpose]);

  if (verified) {
    return (
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-green-700">
        <Icon name="check" size={16} weight={2} />
        شماره موبایل تأیید شد.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={send}
          disabled={!validShape || countdown > 0}
          loading={sending}
          loadingText="در حال ارسال…"
        >
          {countdown > 0
            ? `ارسال مجدد (${fa(countdown)})`
            : sent
              ? "ارسال مجدد کد"
              : "دریافت کد تأیید"}
        </Button>
      </div>

      {sendState.status === "error" && (
        <Alert tone="danger">{sendState.message}</Alert>
      )}

      {sent && (
        <div className="rounded-sm border border-line bg-paper-2/50 p-4">
          {sendState.status === "success" && (
            <p className="mb-3 text-[0.8125rem] text-muted">{sendState.message}</p>
          )}

          <Field
            htmlFor={`otp-code-${purpose}`}
            label="کد تأیید"
            error={verifyState.fieldErrors?.code}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <Input
                  ref={codeRef}
                  id={`otp-code-${purpose}`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="۶ رقم"
                  ltr
                  invalid={verifyState.status === "error"}
                  onKeyDown={(event) => {
                    // Enter here must verify, never submit the outer form with
                    // an unverified number.
                    if (event.key === "Enter") {
                      event.preventDefault();
                      verify();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={verify}
                loading={verifying}
                loadingText="در حال بررسی…"
              >
                تأیید شماره
              </Button>
            </div>
          </Field>

          {verifyState.status === "error" && !verifyState.fieldErrors?.code && (
            <div className="mt-3">
              <Alert tone="danger">{verifyState.message}</Alert>
            </div>
          )}
        </div>
      )}

      <noscript>
        <Alert tone="warning">
          تأیید شماره موبایل به جاوااسکریپت نیاز دارد. لطفاً آن را فعال کنید یا
          با دفتر مؤسسه تماس بگیرید.
        </Alert>
      </noscript>
    </div>
  );
}

/* ========================================================================== */
/*  Input + challenge                                                         */
/* ========================================================================== */

export interface PhoneVerificationProps {
  csrfToken: string;
  purpose: "consultation" | "appointment";
  /** When false this is an ordinary phone input with no challenge. */
  required: boolean;
  error?: string | string[];
  defaultValue?: string;
  label?: string;
  hint?: string;
  /** Notified when verification is gained or lost, to gate the submit button. */
  onVerifiedChange?: (verified: boolean) => void;
}

export function PhoneVerification({
  csrfToken,
  purpose,
  required,
  error,
  defaultValue = "",
  label = "شماره موبایل",
  hint = "کد پیگیری با همین شماره قابل استعلام است.",
  onVerifiedChange,
}: PhoneVerificationProps) {
  const [phone, setPhone] = useState(defaultValue);
  const [proof, setProof] = useState("");

  const handleProof = useCallback(
    (value: string) => {
      setProof(value);
      onVerifiedChange?.(Boolean(value));
    },
    [onVerifiedChange],
  );

  if (!required) {
    return (
      <Field htmlFor="phone" label={label} required hint={hint} error={error}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="09123456789"
          defaultValue={defaultValue}
          ltr
          required
          invalid={Boolean(error)}
        />
      </Field>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Travels with the outer form's submission. */}
      <input type="hidden" name="phoneProof" value={proof} />

      <Field htmlFor="phone" label={label} required hint={hint} error={error}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="09123456789"
          value={phone}
          onChange={(event) => setPhone(digitsOnly(event.target.value))}
          ltr
          required
          invalid={Boolean(error)}
        />
      </Field>

      <PhoneChallenge
        csrfToken={csrfToken}
        purpose={purpose}
        phone={phone}
        onProof={handleProof}
      />
    </div>
  );
}
