"use client";

import { useActionState, useState } from "react";
import type { CustomCodeSettings } from "@/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveAdvancedAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection } from "./form-shell";
import { ConfirmDialog, DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * Advanced settings: custom CSS/JS, analytics and verification codes.
 *
 * This screen is restricted to the super administrator and is the one place in
 * the CMS where input is stored and executed verbatim. Sanitising an analytics
 * snippet would break it, so the protections are authorisation, a prominent
 * warning, a confirmation step before saving, and a revision snapshot so a
 * mistake can be reverted.
 */

const CODE_CLASS =
  "font-mono text-[0.8125rem] leading-[1.9] text-start";

export function AdvancedForm({
  code,
  csrfToken,
}: {
  code: CustomCodeSettings;
  csrfToken: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveAdvancedAction,
    idleState as FormState,
  );

  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات پیشرفته دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
  );

  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <>
      <form
        ref={setFormEl}
        action={formAction}
        onChange={() => setDirty(true)}
        noValidate
        className="flex flex-col gap-6 pb-28"
      >
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

        <Alert tone="warning" title="این بخش پیشرفته است">
          کدهایی که اینجا وارد می‌کنید بدون هیچ بررسی یا پالایشی روی{" "}
          <strong>تمام صفحات وب‌سایت و برای همه بازدیدکنندگان</strong> اجرا
          می‌شوند. یک خطای کوچک می‌تواند ظاهر سایت را به هم بریزد یا آن را از
          کار بیندازد.
          <br />
          <br />
          فقط کدی را وارد کنید که منبع و عملکرد آن را می‌شناسید. پیش از هر
          ذخیره‌سازی، نسخه قبلی به‌صورت خودکار نگهداری می‌شود.
        </Alert>

        {state.status !== "idle" && (
          <Alert
            tone={state.status === "success" ? "success" : "danger"}
            title={state.status === "success" ? "انجام شد" : "ذخیره‌سازی انجام نشد"}
          >
            {state.message}
          </Alert>
        )}

        <FormSection
          title="ابزارهای تحلیل و اعتبارسنجی"
          description="شناسه‌ها را از داشبورد سرویس مربوطه کپی کنید."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              htmlFor="googleAnalyticsId"
              label="شناسه گوگل آنالیتیکس"
              hint="با G- شروع می‌شود."
              error={error("googleAnalyticsId")}
            >
              <Input
                id="googleAnalyticsId"
                name="googleAnalyticsId"
                defaultValue={code.googleAnalyticsId}
                ltr
                placeholder="G-XXXXXXXXXX"
                invalid={Boolean(error("googleAnalyticsId"))}
              />
            </Field>

            <Field
              htmlFor="googleTagManagerId"
              label="شناسه گوگل تگ‌منیجر"
              hint="با GTM- شروع می‌شود."
              error={error("googleTagManagerId")}
            >
              <Input
                id="googleTagManagerId"
                name="googleTagManagerId"
                defaultValue={code.googleTagManagerId}
                ltr
                placeholder="GTM-XXXXXX"
                invalid={Boolean(error("googleTagManagerId"))}
              />
            </Field>

            <Field
              htmlFor="googleSiteVerification"
              label="کد تأیید گوگل سرچ کنسول"
              error={error("googleSiteVerification")}
            >
              <Input
                id="googleSiteVerification"
                name="googleSiteVerification"
                defaultValue={code.googleSiteVerification}
                ltr
              />
            </Field>

            <Field
              htmlFor="bingSiteVerification"
              label="کد تأیید بینگ"
              error={error("bingSiteVerification")}
            >
              <Input
                id="bingSiteVerification"
                name="bingSiteVerification"
                defaultValue={code.bingSiteVerification}
                ltr
              />
            </Field>
          </div>

          <Field
            htmlFor="enamadHtml"
            label="کد نماد اعتماد الکترونیکی"
            hint="کد دریافتی از سامانه نماد را اینجا قرار دهید."
            error={error("enamadHtml")}
          >
            <Textarea
              id="enamadHtml"
              name="enamadHtml"
              rows={4}
              defaultValue={code.enamadHtml}
              dir="ltr"
              className={CODE_CLASS}
            />
          </Field>
        </FormSection>

        <FormSection
          title="کد سفارشی"
          description="CSS و JavaScript اختصاصی که روی همه صفحات اعمال می‌شود."
        >
          <Field
            htmlFor="customCss"
            label="CSS سفارشی"
            hint="بدون تگ style وارد کنید. این کد پس از استایل‌های اصلی سایت بارگذاری می‌شود."
            error={error("customCss")}
          >
            <Textarea
              id="customCss"
              name="customCss"
              rows={10}
              defaultValue={code.customCss}
              dir="ltr"
              className={CODE_CLASS}
              placeholder=".my-class { color: #333; }"
            />
          </Field>

          <Field
            htmlFor="customJs"
            label="JavaScript سفارشی"
            hint="بدون تگ script وارد کنید. در انتهای صفحه اجرا می‌شود."
            error={error("customJs")}
          >
            <Textarea
              id="customJs"
              name="customJs"
              rows={10}
              defaultValue={code.customJs}
              dir="ltr"
              className={CODE_CLASS}
            />
          </Field>
        </FormSection>

        <FormSection
          title="اسکریپت‌های اضافی"
          description="کد کامل همراه با تگ script را می‌توانید مستقیماً وارد کنید."
        >
          <Field
            htmlFor="headScripts"
            label="اسکریپت‌های بخش head"
            hint="برای کدهایی که باید زودتر از محتوای صفحه بارگذاری شوند."
            error={error("headScripts")}
          >
            <Textarea
              id="headScripts"
              name="headScripts"
              rows={6}
              defaultValue={code.headScripts}
              dir="ltr"
              className={CODE_CLASS}
              placeholder='<script src="https://example.com/tag.js"></script>'
            />
          </Field>

          <Field
            htmlFor="bodyScripts"
            label="اسکریپت‌های انتهای صفحه"
            hint="برای کدهایی که نباید بارگذاری صفحه را کند کنند."
            error={error("bodyScripts")}
          >
            <Textarea
              id="bodyScripts"
              name="bodyScripts"
              rows={6}
              defaultValue={code.bodyScripts}
              dir="ltr"
              className={CODE_CLASS}
            />
          </Field>
        </FormSection>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="hidden items-center gap-3 sm:flex">
              <DirtyBadge dirty={dirty && state.status !== "success"} />
              <p className="flex items-center gap-2 text-[0.75rem] text-warning">
                <Icon name="alert" size={14} />
                تغییرات این بخش روی کل وب‌سایت اثر می‌گذارد.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              loading={pending}
              loadingText="در حال ذخیره…"
              onClick={() => setConfirming(true)}
              className="ms-auto min-w-[9rem]"
            >
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          formEl?.requestSubmit();
        }}
        tone="primary"
        title="تأیید ذخیره کدهای سفارشی"
        confirmLabel="بله، ذخیره کن"
        message={
          <>
            کدهای واردشده بلافاصله روی تمام صفحات وب‌سایت اجرا می‌شوند.
            <br />
            <br />
            پس از ذخیره، وب‌سایت را در یک تب جدید باز کنید و از درست کار کردن آن
            مطمئن شوید. نسخه قبلی کدها به‌صورت خودکار نگهداری شده است.
          </>
        }
      />
    </>
  );
}
