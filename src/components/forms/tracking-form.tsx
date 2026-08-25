"use client";

import { useActionState, useEffect, useRef } from "react";
import { lookupTracking } from "@/lib/actions/public";
import { idleState, type FormState, type TrackingResult } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { ROUTES } from "@/lib/config/routes";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import {
  AppointmentStatusView,
  RequestStatusView,
} from "@/components/tracking/status-timeline";

/**
 * Request / booking lookup.
 *
 * Requires both the code and the phone number used to submit it — a code on
 * its own must never reveal case details. The action is additionally rate
 * limited so the form cannot be used to enumerate codes.
 */
export function TrackingForm({
  csrfToken,
  defaultCode = "",
}: {
  csrfToken: string;
  defaultCode?: string;
}) {
  const [state, formAction, pending] = useActionState<
    FormState<TrackingResult>,
    FormData
  >(lookupTracking, idleState as FormState<TrackingResult>);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") resultRef.current?.focus();
  }, [state.status, state.submissionId]);

  const fieldError = (name: string) => state.fieldErrors?.[name];
  const result = state.status === "success" ? state.payload : undefined;

  return (
    <div className="flex flex-col gap-10">
      <div className="surface p-6 sm:p-8">
        <h2 className="text-[1.1875rem] font-bold text-navy-900">
          مشاهده وضعیت درخواست
        </h2>
        <p className="mt-2.5 text-[0.9375rem] leading-[2] text-muted">
          کد پیگیری و شماره موبایلی که هنگام ثبت وارد کرده‌اید را بنویسید.
        </p>

        <form action={formAction} noValidate className="mt-7 flex flex-col gap-6">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              htmlFor="code"
              label="کد پیگیری"
              required
              hint="نمونه: DR-7K3MQX یا RZ-8KD31M"
              error={fieldError("code")}
            >
              <Input
                id="code"
                name="code"
                defaultValue={defaultCode}
                required
                ltr
                autoComplete="off"
                spellCheck={false}
                placeholder="DR-XXXXXX"
                className="uppercase"
                invalid={Boolean(fieldError("code"))}
              />
            </Field>

            <Field
              htmlFor="tracking-phone"
              label="شماره موبایل"
              required
              error={fieldError("phone")}
            >
              <Input
                id="tracking-phone"
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon="search"
              loading={pending}
              loadingText="در حال جست‌وجو…"
              className="sm:min-w-[12rem]"
            >
              مشاهده وضعیت
            </Button>
            <p className="flex items-start gap-2 text-[0.8125rem] leading-[1.9] text-muted">
              <Icon name="lock" size={15} className="mt-0.5 shrink-0 text-gold-600" />
              اطلاعات پرونده تنها با تطابق همزمان کد و شماره موبایل نمایش داده می‌شود.
            </p>
          </div>
        </form>
      </div>

      {/* -- outcome -------------------------------------------------------- */}
      <div ref={resultRef} tabIndex={-1} className="outline-none">
        {state.status === "error" && (
          <Alert tone="danger" title="موردی یافت نشد">
            <div className="flex flex-col gap-4">
              <span>{state.message}</span>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={ROUTES.consultation} variant="outline" size="sm">
                  ثبت درخواست جدید
                </ButtonLink>
                <ButtonLink href={ROUTES.contact} variant="ghost" size="sm">
                  تماس با پشتیبانی
                </ButtonLink>
              </div>
            </div>
          </Alert>
        )}

        {result?.kind === "request" && result.request && (
          <RequestStatusView request={result.request} />
        )}

        {result?.kind === "appointment" && result.appointment && (
          <AppointmentStatusView appointment={result.appointment} />
        )}
      </div>
    </div>
  );
}
