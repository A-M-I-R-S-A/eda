"use client";

import { useState } from "react";
import type { SiteSettings, SocialLink, WorkingHour } from "@/types";
import { saveSettingsAction } from "@/lib/actions/admin";
import { SOCIAL_PLATFORM_OPTIONS } from "@/lib/config/labels";
import { ROUTES } from "@/lib/config/routes";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection, FormShell, ToggleField } from "./form-shell";
import { MediaField } from "./media-picker";

/**
 * Site settings.
 *
 * Working hours and social links are repeatable rows: each row emits inputs
 * with the *same* name, which the action zips back into objects by index. That
 * keeps the form working without JavaScript-only state serialisation.
 */
export function SettingsForm({
  csrfToken,
  settings,
}: {
  csrfToken: string;
  settings: SiteSettings;
}) {
  const [hours, setHours] = useState<WorkingHour[]>(settings.workingHours);
  const [socials, setSocials] = useState<SocialLink[]>(settings.socials);
  const [logo, setLogo] = useState(settings.logoUrl ?? "");
  const [favicon, setFavicon] = useState(settings.faviconUrl ?? "");

  const updateHour = (index: number, patch: Partial<WorkingHour>) =>
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));

  const updateSocial = (index: number, patch: Partial<SocialLink>) =>
    setSocials((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <FormShell
      action={saveSettingsAction}
      csrfToken={csrfToken}
      submitLabel="ذخیره تنظیمات"
      cancelHref={ROUTES.admin.root}
    >
      {({ error }) => (
        <>
          <Alert tone="info" title="این اطلاعات در سراسر وب‌سایت استفاده می‌شود">
            نام مؤسسه، اطلاعات تماس و ساعات کاری در سربرگ، پاورقی، صفحه تماس و
            داده‌های ساختاریافته سئو نمایش داده می‌شوند.
          </Alert>

          <FormSection title="هویت مؤسسه">
            <MediaField
              name="logoUrl"
              label="لوگوی سایت"
              value={logo}
              onChange={setLogo}
              csrfToken={csrfToken}
              hint="در نبود لوگو، نشان برداری اختصاصی مؤسسه نمایش داده می‌شود. لوگوی هدر و فوتر را می‌توانید جداگانه از بخش «منو و فوتر» تعیین کنید."
            />

            <MediaField
              name="faviconUrl"
              label="فاوآیکون"
              value={favicon}
              onChange={setFavicon}
              csrfToken={csrfToken}
              hint="آیکون کوچک نوار مرورگر. ابعاد پیشنهادی ۵۱۲×۵۱۲ پیکسل."
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                htmlFor="institutionName"
                label="نام کامل مؤسسه"
                required
                error={error("institutionName")}
              >
                <Input
                  id="institutionName"
                  name="institutionName"
                  defaultValue={settings.institutionName}
                  required
                  invalid={Boolean(error("institutionName"))}
                />
              </Field>

              <Field
                htmlFor="institutionShortName"
                label="نام کوتاه"
                required
                error={error("institutionShortName")}
              >
                <Input
                  id="institutionShortName"
                  name="institutionShortName"
                  defaultValue={settings.institutionShortName}
                  required
                  invalid={Boolean(error("institutionShortName"))}
                />
              </Field>
            </div>

            <Field htmlFor="tagline" label="شعار" required error={error("tagline")}>
              <Input
                id="tagline"
                name="tagline"
                defaultValue={settings.tagline}
                required
                invalid={Boolean(error("tagline"))}
              />
            </Field>

            <Field
              htmlFor="description"
              label="توضیح مؤسسه"
              required
              hint="در پاورقی و داده‌های سئو استفاده می‌شود."
              error={error("description")}
            >
              <Textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={settings.description}
                required
                invalid={Boolean(error("description"))}
              />
            </Field>

            <Field
              htmlFor="registrationNumber"
              label="شماره ثبت"
              error={error("registrationNumber")}
            >
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={settings.registrationNumber}
                invalid={Boolean(error("registrationNumber"))}
              />
            </Field>
          </FormSection>

          <FormSection
            title="زبان و جهت"
            description="روی برچسب lang و dir سند اعمال می‌شود."
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                htmlFor="language"
                label="زبان پیش‌فرض"
                hint="کد BCP-47، مثلاً fa-IR"
                error={error("language")}
              >
                <Input
                  id="language"
                  name="language"
                  ltr
                  defaultValue={settings.language ?? "fa-IR"}
                  placeholder="fa-IR"
                />
              </Field>

              <Field htmlFor="direction" label="جهت نوشتار">
                <Select
                  id="direction"
                  name="direction"
                  defaultValue={settings.direction ?? "rtl"}
                  options={[
                    { value: "rtl", label: "راست‌به‌چپ (فارسی)" },
                    { value: "ltr", label: "چپ‌به‌راست" },
                  ]}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="اطلاعات تماس">
            <Field
              htmlFor="phones"
              label="شماره‌های تماس"
              required
              hint="هر شماره را در یک خط جداگانه بنویسید. حداکثر ۴ شماره."
              error={error("phones")}
            >
              <Textarea
                id="phones"
                name="phones"
                rows={3}
                dir="ltr"
                defaultValue={settings.phones.join("\n")}
                required
                className="text-start"
                invalid={Boolean(error("phones"))}
              />
            </Field>

            <Field
              htmlFor="mobile"
              label="شماره موبایل"
              hint="اختیاری. جدا از شماره‌های ثابت بالا نمایش داده می‌شود."
              error={error("mobile")}
            >
              <Input
                id="mobile"
                name="mobile"
                ltr
                inputMode="numeric"
                defaultValue={settings.mobile ?? ""}
                placeholder="09121234567"
                invalid={Boolean(error("mobile"))}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field htmlFor="email" label="ایمیل" required error={error("email")}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  ltr
                  defaultValue={settings.email}
                  required
                  invalid={Boolean(error("email"))}
                />
              </Field>

              <Field
                htmlFor="postalCode"
                label="کد پستی"
                required
                hint="۱۰ رقم بدون خط تیره."
                error={error("postalCode")}
              >
                <Input
                  id="postalCode"
                  name="postalCode"
                  ltr
                  inputMode="numeric"
                  defaultValue={settings.postalCode}
                  required
                  invalid={Boolean(error("postalCode"))}
                />
              </Field>
            </div>

            <Field htmlFor="address" label="نشانی" required error={error("address")}>
              <Textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={settings.address}
                required
                invalid={Boolean(error("address"))}
              />
            </Field>
          </FormSection>

          <FormSection
            title="موقعیت روی نقشه"
            description="نشانی نقشه باید یک لینک embed با https باشد."
          >
            <Field
              htmlFor="mapEmbedUrl"
              label="نشانی نقشه (embed)"
              required
              error={error("mapEmbedUrl")}
            >
              <Input
                id="mapEmbedUrl"
                name="mapEmbedUrl"
                ltr
                defaultValue={settings.mapEmbedUrl}
                required
                invalid={Boolean(error("mapEmbedUrl"))}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field htmlFor="mapLat" label="عرض جغرافیایی" required error={error("mapLat")}>
                <Input
                  id="mapLat"
                  name="mapLat"
                  ltr
                  inputMode="decimal"
                  defaultValue={settings.mapLat}
                  required
                  invalid={Boolean(error("mapLat"))}
                />
              </Field>

              <Field htmlFor="mapLng" label="طول جغرافیایی" required error={error("mapLng")}>
                <Input
                  id="mapLng"
                  name="mapLng"
                  ltr
                  inputMode="decimal"
                  defaultValue={settings.mapLng}
                  required
                  invalid={Boolean(error("mapLng"))}
                />
              </Field>
            </div>
          </FormSection>

          {/* -- notary office (a separate entity) --------------------------- */}
          <FormSection
            title="دفتر اسناد رسمی (نهاد مستقل)"
            description="این بخش مربوط به مؤسسه داوری نیست. دفتر اسناد رسمی نهادی جداگانه و متعلق به شخص دیگری است و سردفتر آن، داور مؤسسه نیست. تا زمانی که این بخش فعال و تکمیل نشود، هیچ‌جای وب‌سایت نمایش داده نمی‌شود. هیچ اطلاعاتی را حدس نزنید؛ تنها اطلاعات رسمی و تأییدشده را وارد کنید."
          >
            <ToggleField
              name="notaryEnabled"
              label="نمایش دفتر اسناد رسمی در صفحه تماس"
              description="فقط در صورتی اثر دارد که نام دفتر و نام سردفتر هر دو تکمیل شده باشند."
              defaultChecked={settings.notaryOffice?.enabled ?? false}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                htmlFor="notaryOfficeName"
                label="نام دفتر"
                error={error("notaryOfficeName")}
              >
                <Input
                  id="notaryOfficeName"
                  name="notaryOfficeName"
                  defaultValue={settings.notaryOffice?.officeName ?? ""}
                  placeholder="مثال: دفتر اسناد رسمی شماره …"
                  invalid={Boolean(error("notaryOfficeName"))}
                />
              </Field>

              <Field
                htmlFor="notaryName"
                label="نام سردفتر"
                hint="این شخص، داور مؤسسه نیست."
                error={error("notaryName")}
              >
                <Input
                  id="notaryName"
                  name="notaryName"
                  defaultValue={settings.notaryOffice?.notaryName ?? ""}
                  invalid={Boolean(error("notaryName"))}
                />
              </Field>
            </div>

            <Field
              htmlFor="notaryPhone"
              label="شماره تماس دفتر"
              error={error("notaryPhone")}
            >
              <Input
                id="notaryPhone"
                name="notaryPhone"
                ltr
                defaultValue={settings.notaryOffice?.phone ?? ""}
                invalid={Boolean(error("notaryPhone"))}
              />
            </Field>

            <Field
              htmlFor="notaryAddress"
              label="نشانی دفتر"
              error={error("notaryAddress")}
            >
              <Textarea
                id="notaryAddress"
                name="notaryAddress"
                rows={2}
                defaultValue={settings.notaryOffice?.address ?? ""}
                invalid={Boolean(error("notaryAddress"))}
              />
            </Field>

            <Field
              htmlFor="notaryNote"
              label="توضیح کوتاه"
              hint="اختیاری. برای مثال، خدماتی که این دفتر ارائه می‌دهد."
              error={error("notaryNote")}
            >
              <Textarea
                id="notaryNote"
                name="notaryNote"
                rows={3}
                defaultValue={settings.notaryOffice?.note ?? ""}
                invalid={Boolean(error("notaryNote"))}
              />
            </Field>
          </FormSection>

          {/* -- working hours ---------------------------------------------- */}
          <FormSection
            title="ساعات کاری"
            description="در پاورقی، صفحه تماس و داده ساختاریافته Organization استفاده می‌شود."
          >
            <ul className="flex flex-col gap-3">
              {hours.map((hour, index) => (
                <li key={index} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    name="hourLabel"
                    value={hour.label}
                    onChange={(e) => updateHour(index, { label: e.target.value })}
                    placeholder="روزها"
                    aria-label={`عنوان بازه ${index + 1}`}
                    className="min-h-11 flex-1 rounded-sm border border-line-2 bg-white px-3.5 text-[0.875rem] focus:border-navy-600 focus:outline-none"
                  />
                  <input
                    name="hourValue"
                    value={hour.value}
                    onChange={(e) => updateHour(index, { value: e.target.value })}
                    placeholder="ساعت"
                    aria-label={`ساعت بازه ${index + 1}`}
                    className="min-h-11 flex-1 rounded-sm border border-line-2 bg-white px-3.5 text-[0.875rem] focus:border-navy-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setHours((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`حذف بازه ${index + 1}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>

            {hours.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon="plus"
                className="self-start"
                onClick={() => setHours((prev) => [...prev, { label: "", value: "" }])}
              >
                افزودن بازه زمانی
              </Button>
            )}
          </FormSection>

          {/* -- socials ----------------------------------------------------- */}
          <FormSection
            title="شبکه‌های اجتماعی"
            description="نشانی‌ها باید کامل و با https باشند؛ موارد ناقص ذخیره نمی‌شوند."
          >
            <ul className="flex flex-col gap-3">
              {socials.map((social, index) => (
                <li key={index} className="flex flex-col gap-3 sm:flex-row">
                  <div className="sm:w-40">
                    <Select
                      name="socialPlatform"
                      aria-label={`نوع شبکه ${index + 1}`}
                      value={social.platform}
                      onChange={(e) =>
                        updateSocial(index, {
                          platform: e.target.value as SocialLink["platform"],
                        })
                      }
                      options={SOCIAL_PLATFORM_OPTIONS}
                      className="!min-h-11 !py-0"
                    />
                  </div>

                  <input
                    name="socialLabel"
                    value={social.label}
                    onChange={(e) => updateSocial(index, { label: e.target.value })}
                    placeholder="عنوان نمایشی"
                    aria-label={`عنوان شبکه ${index + 1}`}
                    className="min-h-11 flex-1 rounded-sm border border-line-2 bg-white px-3.5 text-[0.875rem] focus:border-navy-600 focus:outline-none"
                  />

                  <input
                    name="socialUrl"
                    value={social.url}
                    onChange={(e) => updateSocial(index, { url: e.target.value })}
                    dir="ltr"
                    placeholder="https://…"
                    aria-label={`نشانی شبکه ${index + 1}`}
                    className="min-h-11 flex-[2] rounded-sm border border-line-2 bg-white px-3.5 text-start text-[0.875rem] focus:border-navy-600 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setSocials((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`حذف شبکه ${index + 1}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>

            {socials.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon="plus"
                className="self-start"
                onClick={() =>
                  setSocials((prev) => [
                    ...prev,
                    { platform: "linkedin", label: "لینکدین", url: "" },
                  ])
                }
              >
                افزودن شبکه اجتماعی
              </Button>
            )}
          </FormSection>
        </>
      )}
    </FormShell>
  );
}
