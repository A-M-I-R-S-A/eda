"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactMessage } from "@/lib/actions/public";
import { idleState, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";

const SUBJECT_SUGGESTIONS = [
  "پرسش درباره داوری",
  "هزینه و تعرفه خدمات",
  "درخواست همکاری",
  "پیگیری پرونده",
  "سایر موضوعات",
];

export function ContactForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    submitContactMessage,
    idleState as FormState,
  );

  const outcomeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "idle") return;
    outcomeRef.current?.focus();
    if (state.status === "success") formRef.current?.reset();
  }, [state.status, state.submissionId]);

  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

      {state.status !== "idle" && (
        <div ref={outcomeRef} tabIndex={-1} className="outline-none">
          <Alert
            tone={state.status === "success" ? "success" : "danger"}
            title={state.status === "success" ? "پیام ارسال شد" : "ارسال پیام انجام نشد"}
          >
            {state.message}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          htmlFor="contact-name"
          label="نام و نام خانوادگی"
          required
          error={fieldError("fullName")}
        >
          <Input
            id="contact-name"
            name="fullName"
            autoComplete="name"
            required
            placeholder="نام شما"
            invalid={Boolean(fieldError("fullName"))}
          />
        </Field>

        <Field
          htmlFor="contact-phone"
          label="شماره تماس"
          required
          error={fieldError("phone")}
        >
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            ltr
            placeholder="09123456789"
            invalid={Boolean(fieldError("phone"))}
          />
        </Field>
      </div>

      <Field
        htmlFor="contact-email"
        label="ایمیل"
        optionalLabel
        error={fieldError("email")}
      >
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          ltr
          placeholder="name@example.com"
          invalid={Boolean(fieldError("email"))}
        />
      </Field>

      <Field
        htmlFor="contact-subject"
        label="موضوع"
        required
        error={fieldError("subject")}
      >
        <Input
          id="contact-subject"
          name="subject"
          required
          list="contact-subject-options"
          placeholder="موضوع پیام"
          invalid={Boolean(fieldError("subject"))}
        />
        <datalist id="contact-subject-options">
          {SUBJECT_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </Field>

      <Field
        htmlFor="contact-message"
        label="پیام"
        required
        hint="لطفاً موضوع را تا حد امکان مشخص بنویسید تا پاسخ دقیق‌تری دریافت کنید."
        error={fieldError("message")}
      >
        <Textarea
          id="contact-message"
          name="message"
          rows={6}
          required
          minLength={15}
          placeholder="متن پیام شما…"
          invalid={Boolean(fieldError("message"))}
        />
      </Field>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon="send"
          loading={pending}
          loadingText="در حال ارسال…"
          className="sm:min-w-[11rem]"
        >
          ارسال پیام
        </Button>
        <p className="text-[0.8125rem] leading-[1.9] text-muted">
          پاسخ‌گویی در روزهای کاری، حداکثر ظرف دو روز کاری.
        </p>
      </div>
    </form>
  );
}
