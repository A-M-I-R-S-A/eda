"use client";

import { useActionState, useState } from "react";
import type { SmsSettings } from "@/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveSmsSettingsAction } from "@/lib/actions/settings";
import { APPOINTMENT_STATUS, REQUEST_STATUS } from "@/lib/config/labels";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { FormSection } from "./form-shell";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * SMS configuration.
 *
 * Credentials are conspicuously absent: the API key, line number and OTP
 * template id come from the environment. Putting them on a settings screen
 * would make the provider account readable by anyone who reaches the admin
 * panel and would write the key into every database backup.
 *
 * What *is* editable here is behaviour and wording — the things the office
 * actually needs to change without a deploy.
 */

const PLACEHOLDER_HELP =
  "متغیرها: {name} نام متقاضی، {code} کد پیگیری، {status} وضعیت، {institution} نام مؤسسه، {date} و {time} برای نوبت‌ها.";

export function SmsSettingsForm({
  sms,
  csrfToken,
  credentialsPresent,
}: {
  sms: SmsSettings;
  csrfToken: string;
  /** Whether `SMSIR_API_KEY` is set on the server. */
  credentialsPresent: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveSmsSettingsAction,
    idleState as FormState,
  );

  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات پیامک دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
  );

  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="flex flex-col gap-6 pb-28"
    >
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

      {!credentialsPresent && (
        <Alert tone="warning" title="کلید سامانه پیامک تنظیم نشده است">
          مقدار <code>SMSIR_API_KEY</code> روی سرور تعریف نشده است. تا زمانی که
          این متغیر و <code>SMSIR_LINE_NUMBER</code> و{" "}
          <code>SMSIR_OTP_TEMPLATE_ID</code> تنظیم نشوند، هیچ پیامکی ارسال
          نمی‌شود. این مقادیر به‌دلایل امنیتی از طریق پنل قابل ویرایش نیستند.
        </Alert>
      )}

      {state.status !== "idle" && (
        <Alert
          tone={state.status === "success" ? "success" : "danger"}
          title={state.status === "success" ? "انجام شد" : "ذخیره‌سازی انجام نشد"}
        >
          {state.message}
        </Alert>
      )}

      <FormSection
        title="وضعیت سرویس"
        description="تا زمانی که این گزینه فعال نباشد، هیچ پیامکی ارسال نمی‌شود."
      >
        <div className="flex flex-col gap-4">
          <Checkbox
            id="enabled"
            name="enabled"
            defaultChecked={sms.enabled}
            label="ارسال پیامک فعال باشد"
          />

          <Checkbox
            id="requirePhoneVerification"
            name="requirePhoneVerification"
            defaultChecked={sms.requirePhoneVerification}
            label="تأیید شماره موبایل با کد یک‌بارمصرف در فرم‌های عمومی الزامی باشد"
          />

          <p className="text-[0.8125rem] leading-[1.9] text-muted">
            با فعال بودن تأیید شماره، ثبت درخواست مشاوره و رزرو وقت تنها پس از
            تأیید شماره موبایل ممکن است.
            <br />
            تأیید شماره تنها زمانی اعمال می‌شود که «ارسال پیامک» هم فعال باشد؛
            در غیر این صورت فرم‌ها بدون تأیید کار می‌کنند تا درخواستی از دست
            نرود.
          </p>

          <Field
            htmlFor="signature"
            label="امضای پایان پیامک"
            hint="به انتهای هر پیامک افزوده می‌شود."
            error={error("signature")}
          >
            <Input
              id="signature"
              name="signature"
              defaultValue={sms.signature}
              maxLength={60}
              placeholder="مؤسسه داوری دادآور"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="اطلاع‌رسانی به دفتر"
        description="پیامک خودکار هنگام دریافت درخواست یا رزرو جدید."
      >
        <div className="flex flex-col gap-4">
          <Checkbox
            id="notifyAdminOnRequest"
            name="notifyAdminOnRequest"
            defaultChecked={sms.notifyAdminOnRequest}
            label="با ثبت درخواست مشاوره جدید به دفتر پیامک ارسال شود"
          />

          <Checkbox
            id="notifyAdminOnAppointment"
            name="notifyAdminOnAppointment"
            defaultChecked={sms.notifyAdminOnAppointment}
            label="با ثبت رزرو وقت جدید به دفتر پیامک ارسال شود"
          />

          <Field
            htmlFor="adminRecipients"
            label="شماره‌های گیرنده"
            hint="هر شماره در یک خط. اگر خالی بماند، شماره موبایل مؤسسه در تنظیمات عمومی استفاده می‌شود."
            error={error("adminRecipients")}
          >
            <Textarea
              id="adminRecipients"
              name="adminRecipients"
              rows={3}
              defaultValue={sms.adminRecipients.join("\n")}
              placeholder={"09121234567\n09129876543"}
              className="text-start"
              dir="ltr"
              invalid={Boolean(error("adminRecipients"))}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="متن پیش‌فرض پیامک درخواست‌ها"
        description={`این متن‌ها فقط در کادر ارسال پیامک صفحه درخواست از پیش پر می‌شوند؛ ارسال همیشه دستی است. ${PLACEHOLDER_HELP}`}
      >
        <div className="flex flex-col gap-5">
          {(Object.keys(REQUEST_STATUS) as (keyof typeof REQUEST_STATUS)[]).map(
            (status) => (
              <Field
                key={status}
                htmlFor={`template-request-${status}`}
                label={REQUEST_STATUS[status].label}
              >
                <Textarea
                  id={`template-request-${status}`}
                  name={`template.request.${status}`}
                  rows={2}
                  maxLength={420}
                  defaultValue={sms.requestStatusTemplates?.[status] ?? ""}
                  placeholder="خالی بگذارید تا کادر ارسال بدون متن پیش‌فرض باز شود."
                />
              </Field>
            ),
          )}
        </div>
      </FormSection>

      <FormSection
        title="متن پیش‌فرض پیامک نوبت‌ها"
        description={PLACEHOLDER_HELP}
      >
        <div className="flex flex-col gap-5">
          {(
            Object.keys(APPOINTMENT_STATUS) as (keyof typeof APPOINTMENT_STATUS)[]
          ).map((status) => (
            <Field
              key={status}
              htmlFor={`template-appointment-${status}`}
              label={APPOINTMENT_STATUS[status].label}
            >
              <Textarea
                id={`template-appointment-${status}`}
                name={`template.appointment.${status}`}
                rows={2}
                maxLength={420}
                defaultValue={sms.appointmentStatusTemplates?.[status] ?? ""}
                placeholder="خالی بگذارید تا کادر ارسال بدون متن پیش‌فرض باز شود."
              />
            </Field>
          ))}
        </div>
      </FormSection>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:inset-s-auto">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <DirtyBadge dirty={dirty && state.status !== "success"} />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={pending}
            loadingText="در حال ذخیره…"
          >
            ذخیره تنظیمات پیامک
          </Button>
        </div>
      </div>
    </form>
  );
}
