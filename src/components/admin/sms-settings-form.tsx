"use client";

import { useActionState, useState } from "react";
import type { SmsSettings } from "@/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveSmsSettingsAction } from "@/lib/actions/settings";
import { fa } from "@/lib/utils/persian";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { FormSection } from "./form-shell";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * SMS configuration.
 *
 * Everything the provider needs is editable here — the account key, the line,
 * and for each of the three flows the registered template and the names of its
 * parameters. What is *not* editable is the wording: sms.ir delivers
 * transactional messages through templates registered and approved in its own
 * panel, and the API supplies only parameter values. A textarea here would
 * promise an ability the account does not have, and every send would be
 * refused.
 *
 * The stored API key is never sent to the browser. The field is therefore
 * always blank, and blank means "leave it as it is" — the alternative, echoing
 * the key back into a form, would put it in the page source of every visit to
 * this screen.
 */
export function SmsSettingsForm({
  sms,
  csrfToken,
  keyStored,
  keyFromEnvironment,
  credit,
}: {
  sms: SmsSettings;
  csrfToken: string;
  /** Whether a key was entered here, as opposed to inherited or absent. */
  keyStored: boolean;
  /** Whether the key in use came from `SMSIR_API_KEY` on the server. */
  keyFromEnvironment: boolean;
  /** Account credit read back with the current key. `null` if unavailable. */
  credit: number | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveSmsSettingsAction,
    idleState as FormState,
  );

  const [dirty, setDirty] = useState(false);
  const [replacingKey, setReplacingKey] = useState(!keyStored && !keyFromEnvironment);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات پیامک دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
  );

  const error = (name: string) => state.fieldErrors?.[name];
  const configured = keyStored || keyFromEnvironment;

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="flex flex-col gap-6 pb-28"
    >
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

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
        آن است. برای تغییر متن، قالب را در پنل sms.ir ویرایش کنید.
      </Alert>

      {/* -- provider account ------------------------------------------------ */}
      <FormSection
        title="حساب سامانه پیامک"
        description="کلید API و شماره خط از پنل sms.ir. بدون کلید معتبر هیچ پیامکی ارسال نمی‌شود."
      >
        <div className="flex flex-col gap-5">
          {configured ? (
            <Alert
              tone={credit === null ? "warning" : "success"}
              title={
                credit === null
                  ? "اعتبار حساب خوانده نشد"
                  : `اعتبار حساب: ${fa(credit)} ریال`
              }
            >
              {credit === null
                ? "کلید ثبت شده است اما پاسخی از sms.ir دریافت نشد. کلید یا دسترسی اینترنت سرور را بررسی کنید."
                : "کلید فعلی معتبر است و اعتبار حساب با موفقیت خوانده شد."}
              {keyFromEnvironment && (
                <>
                  {" "}
                  کلید در حال استفاده از متغیر <code>SMSIR_API_KEY</code> روی سرور
                  خوانده می‌شود. اگر کلیدی در همین صفحه وارد کنید، جایگزین آن
                  می‌شود.
                </>
              )}
            </Alert>
          ) : (
            <Alert tone="warning" title="کلید سامانه پیامک ثبت نشده است">
              تا زمانی که کلید API وارد نشود هیچ پیامکی — از جمله کد تأیید شماره
              — ارسال نمی‌شود.
            </Alert>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              htmlFor="apiKey"
              label="کلید API"
              hint={
                keyStored && !replacingKey
                  ? "کلید ذخیره شده است. برای تغییر، «تغییر کلید» را بزنید."
                  : "از بخش «توسعه‌دهندگان» در پنل sms.ir"
              }
              error={error("apiKey")}
            >
              {keyStored && !replacingKey ? (
                <div className="flex items-center gap-3">
                  <Input
                    value="••••••••••••••••••••"
                    readOnly
                    disabled
                    ltr
                    aria-label="کلید ذخیره‌شده"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplacingKey(true)}
                  >
                    تغییر کلید
                  </Button>
                </div>
              ) : (
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  ltr
                  placeholder="کلید جدید را اینجا وارد کنید"
                  invalid={Boolean(error("apiKey"))}
                />
              )}
            </Field>

            <Field
              htmlFor="lineNumber"
              label="شماره خط"
              hint="تنها برای نمایش؛ ارسال از قالب انجام می‌شود."
              error={error("lineNumber")}
            >
              <Input
                id="lineNumber"
                name="lineNumber"
                defaultValue={sms.lineNumber}
                ltr
                inputMode="numeric"
                placeholder="30007732"
              />
            </Field>
          </div>

          {keyStored && (
            <Checkbox
              id="clearApiKey"
              name="clearApiKey"
              label="کلید ذخیره‌شده حذف شود"
              error={error("clearApiKey")}
            />
          )}

          <p className="text-[0.8125rem] leading-[1.9] text-muted">
            کلید ذخیره‌شده هیچ‌گاه به مرورگر ارسال نمی‌شود و در این صفحه قابل
            خواندن نیست. خالی گذاشتن این فیلد یعنی «کلید فعلی حفظ شود».
          </p>
        </div>
      </FormSection>

      {/* -- master switches -------------------------------------------------- */}
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
            label="تأیید شماره موبایل با کد یک‌بارمصرف در فرم رزرو وقت الزامی باشد"
          />

          <p className="text-[0.8125rem] leading-[1.9] text-muted">
            تأیید شماره تنها زمانی اعمال می‌شود که «ارسال پیامک» هم فعال باشد؛ در
            غیر این صورت فرم بدون تأیید کار می‌کند تا رزروی از دست نرود.
          </p>
        </div>
      </FormSection>

      {/* -- otp -------------------------------------------------------------- */}
      <FormSection
        title="کد تأیید شماره موبایل"
        description="قالبی که کد یک‌بارمصرف با آن ارسال می‌شود. تنها یک پارامتر دارد: خود کد."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            htmlFor="otpTemplateId"
            label="شناسه قالب کد تأیید"
            hint="خالی بگذارید تا تأیید شماره غیرفعال بماند."
            error={error("otpTemplateId")}
          >
            <Input
              id="otpTemplateId"
              name="otpTemplateId"
              defaultValue={sms.otpTemplateId}
              ltr
              inputMode="numeric"
              placeholder="123455"
              invalid={Boolean(error("otpTemplateId"))}
            />
          </Field>

          <Field
            htmlFor="otpCodeParam"
            label="پارامتر کد"
            error={error("otpCodeParam")}
          >
            <Input
              id="otpCodeParam"
              name="otpCodeParam"
              defaultValue={sms.otpCodeParam}
              ltr
              placeholder="CODE"
            />
          </Field>
        </div>
      </FormSection>

      {/* -- staff alerts ------------------------------------------------------ */}
      <FormSection
        title="اطلاع‌رسانی به همکاران"
        description="پیامک خودکار هنگام ثبت رزرو جدید. قالب باید دو پارامتر داشته باشد: نام همکار و کد رزرو."
      >
        <div className="flex flex-col gap-5">
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

      {/* -- client status update ---------------------------------------------- */}
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
