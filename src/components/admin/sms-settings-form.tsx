"use client";

import { useActionState, useState } from "react";
import type { SmsSettings } from "@/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveSmsSettingsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { FormSection } from "./form-shell";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * SMS configuration.
 *
 * Two things are conspicuously absent, both deliberately:
 *
 *   • **Message wording.** sms.ir delivers transactional messages through
 *     templates registered and approved in its own panel; the API supplies
 *     only parameter values. A box for composing text here would promise an
 *     ability the account does not have, and every send would be refused.
 *
 *   • **Credentials.** The API key comes from the environment. Putting it on a
 *     settings screen would make the provider account readable by anyone who
 *     reaches the admin panel, and would write it into every backup.
 *
 * What is editable is the mapping: which template, and what its parameters are
 * called.
 */

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
          این متغیر تنظیم نشود هیچ پیامکی ارسال نمی‌شود. این مقدار به‌دلایل
          امنیتی از طریق پنل قابل ویرایش نیست.
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

      <Alert tone="info" title="متن پیامک‌ها در پنل sms.ir تعریف می‌شود">
        این سامانه پیامک‌ها را از طریق «قالب»‌های ثبت‌شده در پنل sms.ir ارسال
        می‌کند و تنها مقدار پارامترها را می‌فرستد. بنابراین متن پیام در این صفحه
        قابل ویرایش نیست؛ آنچه اینجا تنظیم می‌کنید شناسه قالب و نام پارامترهای
        آن است.
      </Alert>

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
            تأیید شماره تنها زمانی اعمال می‌شود که «ارسال پیامک» هم فعال باشد؛ در
            غیر این صورت فرم‌ها بدون تأیید کار می‌کنند تا درخواستی از دست نرود.
            <br />
            شناسه قالب کد تأیید از متغیر <code>SMSIR_OTP_TEMPLATE_ID</code> روی
            سرور خوانده می‌شود.
          </p>
        </div>
      </FormSection>

      <FormSection
        title="اطلاع‌رسانی به همکاران"
        description="پیامک خودکار هنگام ثبت درخواست یا رزرو جدید. قالب باید دو پارامتر داشته باشد: نام همکار و کد پیگیری."
      >
        <div className="flex flex-col gap-5">
          <Checkbox
            id="notifyStaffOnRequest"
            name="notifyStaffOnRequest"
            defaultChecked={sms.notifyStaffOnRequest}
            label="با ثبت درخواست مشاوره جدید پیامک ارسال شود"
          />

          <Checkbox
            id="notifyStaffOnAppointment"
            name="notifyStaffOnAppointment"
            defaultChecked={sms.notifyStaffOnAppointment}
            label="با ثبت رزرو وقت جدید پیامک ارسال شود"
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              htmlFor="staffTemplateId"
              label="شناسه قالب"
              hint="از پنل sms.ir"
              error={error("staffTemplateId")}
            >
              <Input
                id="staffTemplateId"
                name="staffTemplateId"
                defaultValue={sms.staffTemplateId}
                ltr
                inputMode="numeric"
                placeholder="123456"
                invalid={Boolean(error("staffTemplateId"))}
              />
            </Field>

            <Field
              htmlFor="staffNameParam"
              label="پارامتر نام"
              error={error("staffNameParam")}
            >
              <Input
                id="staffNameParam"
                name="staffNameParam"
                defaultValue={sms.staffNameParam}
                ltr
                placeholder="NAME"
              />
            </Field>

            <Field
              htmlFor="staffCodeParam"
              label="پارامتر کد"
              error={error("staffCodeParam")}
            >
              <Input
                id="staffCodeParam"
                name="staffCodeParam"
                defaultValue={sms.staffCodeParam}
                ltr
                placeholder="CODE"
              />
            </Field>
          </div>

          <Field
            htmlFor="staffRecipients"
            label="همکاران گیرنده"
            hint="هر نفر در یک خط، با قالب: نام | شماره — مثال: علی رضایی | 09121234567"
            error={error("staffRecipients")}
          >
            <Textarea
              id="staffRecipients"
              name="staffRecipients"
              rows={4}
              defaultValue={(sms.staffRecipients ?? [])
                .map((person) => `${person.name} | ${person.phone}`)
                .join("\n")}
              placeholder={"علی رضایی | 09121234567\nمریم احمدی | 09129876543"}
              invalid={Boolean(error("staffRecipients"))}
            />
          </Field>

          <p className="text-[0.8125rem] leading-[1.9] text-muted">
            به هر نفر یک پیامک جداگانه ارسال می‌شود، چون قالب نام او را در متن
            می‌آورد.
          </p>
        </div>
      </FormSection>

      <FormSection
        title="اطلاع‌رسانی به متقاضی"
        description="قالبی که کارشناس از صفحه درخواست یا نوبت ارسال می‌کند. تنها یک پارامتر دارد: کد پیگیری."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            htmlFor="updateTemplateId"
            label="شناسه قالب به‌روزرسانی"
            hint="خالی بگذارید تا ارسال غیرفعال بماند."
            error={error("updateTemplateId")}
          >
            <Input
              id="updateTemplateId"
              name="updateTemplateId"
              defaultValue={sms.updateTemplateId}
              ltr
              inputMode="numeric"
              placeholder="123457"
              invalid={Boolean(error("updateTemplateId"))}
            />
          </Field>

          <Field
            htmlFor="updateCodeParam"
            label="پارامتر کد"
            error={error("updateCodeParam")}
          >
            <Input
              id="updateCodeParam"
              name="updateCodeParam"
              defaultValue={sms.updateCodeParam}
              ltr
              placeholder="CODE"
            />
          </Field>
        </div>

        <p className="mt-4 text-[0.8125rem] leading-[1.9] text-muted">
          ارسال این پیامک هیچ‌گاه خودکار نیست: کارشناس در صفحه هر درخواست دکمه
          ارسال را می‌زند.
        </p>
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
