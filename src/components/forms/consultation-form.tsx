"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitConsultationRequest } from "@/lib/actions/public";
import { idleState, type ConsultationReceipt, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import {
  CALL_WINDOW_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  LEGAL_AREAS,
  REQUEST_TYPE,
  REQUEST_TYPE_OPTIONS,
} from "@/lib/config/labels";
import { ROUTES } from "@/lib/config/routes";
import { ACCEPT_ATTRIBUTE, UPLOAD_HINT } from "@/lib/security/upload-constants";
import { formatJalali } from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { FileInput } from "./file-input";
import { PhoneVerification } from "./phone-verification";
import { Receipt } from "./receipt";

/**
 * Consultation / arbitration request form.
 *
 * Progressive enhancement: it is a real `<form action={…}>` bound to a Server
 * Action, so it submits without client JS. With JS, `useActionState` renders
 * pending state and inline field errors without a page reload.
 */
export function ConsultationForm({
  csrfToken,
  requirePhoneVerification = false,
}: {
  csrfToken: string;
  /** Mirrors `settings.sms.requirePhoneVerification`; enforced server-side too. */
  requirePhoneVerification?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    FormState<ConsultationReceipt>,
    FormData
  >(submitConsultationRequest, idleState as FormState<ConsultationReceipt>);

  const errorRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Stable identity so `PhoneVerification`'s notify effect does not re-run on
  // every render of this form.
  const handleVerifiedChange = useCallback(
    (verified: boolean) => setPhoneVerified(verified),
    [],
  );

  // Move focus to whichever outcome appeared so screen readers announce it.
  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
    if (state.status === "success") receiptRef.current?.focus();
  }, [state.status, state.submissionId]);

  const fieldError = (name: string) => state.fieldErrors?.[name];

  if (state.status === "success" && state.payload) {
    const receipt = state.payload;

    return (
      <div ref={receiptRef} tabIndex={-1} className="outline-none">
        <Receipt
          title="درخواست شما ثبت شد"
          description="کارشناسان مؤسسه در روزهای کاری موضوع را بررسی می‌کنند و از طریق روش تماس انتخابی با شما ارتباط می‌گیرند."
          code={receipt.trackingCode}
          codeLabel="کد پیگیری شما"
          rows={[
            { label: "نوع درخواست", value: REQUEST_TYPE[receipt.requestType] },
            { label: "تاریخ ثبت", value: formatJalali(receipt.createdAt) },
            { label: "وضعیت درخواست", value: "ثبت شده" },
            {
              label: "فایل‌های پیوست",
              value: receipt.attachmentCount
                ? `${fa(receipt.attachmentCount)} فایل`
                : "بدون پیوست",
            },
          ]}
        />
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-7">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert tone="danger" title="ثبت درخواست انجام نشد">
            {state.message}
          </Alert>
        </div>
      )}

      {/* -- identity ------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-6">
        <legend className="sr-only">اطلاعات تماس</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            htmlFor="fullName"
            label="نام و نام خانوادگی"
            required
            error={fieldError("fullName")}
          >
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder="مثال: رضا کاویانی"
              required
              invalid={Boolean(fieldError("fullName"))}
              aria-describedby={fieldError("fullName") ? "fullName-error" : undefined}
            />
          </Field>

          <PhoneVerification
            csrfToken={csrfToken}
            purpose="consultation"
            required={requirePhoneVerification}
            error={fieldError("phone")}
            onVerifiedChange={handleVerifiedChange}
          />
        </div>

        <Field
          htmlFor="email"
          label="ایمیل"
          optionalLabel
          error={fieldError("email")}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            ltr
            invalid={Boolean(fieldError("email"))}
          />
        </Field>
      </fieldset>

      <hr className="hairline" />

      {/* -- request -------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-6">
        <legend className="sr-only">مشخصات درخواست</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            htmlFor="requestType"
            label="نوع درخواست"
            required
            error={fieldError("requestType")}
          >
            <Select
              id="requestType"
              name="requestType"
              required
              defaultValue="consultation"
              options={REQUEST_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              invalid={Boolean(fieldError("requestType"))}
            />
          </Field>

          <Field
            htmlFor="legalArea"
            label="حوزه حقوقی"
            required
            error={fieldError("legalArea")}
          >
            <Select
              id="legalArea"
              name="legalArea"
              required
              placeholder="انتخاب کنید…"
              options={LEGAL_AREAS.map((area) => ({ value: area, label: area }))}
              invalid={Boolean(fieldError("legalArea"))}
            />
          </Field>
        </div>

        <Field
          htmlFor="subject"
          label="موضوع درخواست"
          required
          hint="در یک جمله کوتاه، موضوع را توصیف کنید."
          error={fieldError("subject")}
        >
          <Input
            id="subject"
            name="subject"
            required
            placeholder="مثال: اختلاف در تعدیل قیمت قرارداد پیمانکاری"
            invalid={Boolean(fieldError("subject"))}
          />
        </Field>

        <Field
          htmlFor="description"
          label="شرح موضوع"
          required
          hint="سابقه اختلاف، اقدامات انجام‌شده و خواسته خود را بنویسید. هرچه دقیق‌تر، بررسی سریع‌تر انجام می‌شود."
          error={fieldError("description")}
        >
          <Textarea
            id="description"
            name="description"
            rows={7}
            required
            minLength={30}
            placeholder="شرح کامل موضوع…"
            invalid={Boolean(fieldError("description"))}
          />
        </Field>
      </fieldset>

      <hr className="hairline" />

      {/* -- contact preference --------------------------------------------- */}
      <fieldset className="flex flex-col gap-6">
        <legend className="sr-only">ترجیحات تماس</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            htmlFor="preferredContact"
            label="روش تماس ترجیحی"
            required
            error={fieldError("preferredContact")}
          >
            <Select
              id="preferredContact"
              name="preferredContact"
              required
              defaultValue="phone"
              options={CONTACT_METHOD_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              invalid={Boolean(fieldError("preferredContact"))}
            />
          </Field>

          <Field
            htmlFor="preferredWindow"
            label="زمان مناسب تماس"
            required
            error={fieldError("preferredWindow")}
          >
            <Select
              id="preferredWindow"
              name="preferredWindow"
              required
              defaultValue="morning"
              options={CALL_WINDOW_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              invalid={Boolean(fieldError("preferredWindow"))}
            />
          </Field>
        </div>

        <FileInput
          id="attachments"
          name="attachments"
          label="فایل پیوست"
          accept={ACCEPT_ATTRIBUTE}
          hint={UPLOAD_HINT}
          error={fieldError("attachments")}
        />
      </fieldset>

      <hr className="hairline" />

      {/* -- consent -------------------------------------------------------- */}
      <Checkbox
        id="consent"
        name="consent"
        value="true"
        required
        error={fieldError("consent")}
        label={
          <>
            با ثبت این درخواست،{" "}
            <Link
              href={ROUTES.privacy}
              target="_blank"
              className="font-medium text-navy-800 underline underline-offset-4 decoration-gold-300 hover:decoration-gold-500"
            >
              سیاست حفظ حریم خصوصی
            </Link>{" "}
            و{" "}
            <Link
              href={ROUTES.terms}
              target="_blank"
              className="font-medium text-navy-800 underline underline-offset-4 decoration-gold-300 hover:decoration-gold-500"
            >
              شرایط و قوانین
            </Link>{" "}
            مؤسسه را می‌پذیرم و با پردازش اطلاعات ارسالی برای بررسی پرونده موافقم.
          </>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          loadingText="در حال ثبت درخواست…"
          /**
           * Disabled until the number is verified so the visitor is stopped
           * here rather than losing a long form to a server-side rejection.
           * The action re-checks regardless — this is convenience, not the
           * control.
           */
          disabled={requirePhoneVerification && !phoneVerified}
          className="sm:min-w-[15rem]"
        >
          ثبت درخواست و دریافت کد پیگیری
        </Button>

        <p className="text-[0.8125rem] leading-[1.9] text-muted">
          {requirePhoneVerification && !phoneVerified
            ? "برای ثبت درخواست، ابتدا شماره موبایل خود را تأیید کنید."
            : "پس از ثبت، یک کد پیگیری دریافت می‌کنید."}
        </p>
      </div>
    </form>
  );
}
