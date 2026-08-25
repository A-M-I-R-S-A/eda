"use client";

import { useActionState, useState } from "react";
import type { BrandingSettings } from "@/types";
import { DEFAULT_BRANDING } from "@/data/defaults";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveBrandingAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection } from "./form-shell";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * Branding.
 *
 * Colours are applied as CSS custom properties that override the compile-time
 * design tokens, so a change here reaches every component without any of them
 * knowing about it. Values equal to the shipped defaults are not emitted at
 * all — an untouched installation renders exactly the designed palette.
 *
 * The live preview matters more than it looks: a colour picker shows a swatch,
 * but only a rendered button and heading show whether the pair is actually
 * readable together.
 */

const COLOR_FIELDS: {
  name: keyof BrandingSettings;
  label: string;
  hint: string;
}[] = [
  {
    name: "primaryColor",
    label: "رنگ اصلی",
    hint: "دکمه‌ها، عناوین و فوتر.",
  },
  {
    name: "secondaryColor",
    label: "رنگ ثانویه",
    hint: "زیرعنوان‌ها و حالت‌های ثانویه.",
  },
  {
    name: "accentColor",
    label: "رنگ تأکید",
    hint: "خطوط تزئینی، آیکون‌ها و برچسب‌ها.",
  },
  {
    name: "backgroundColor",
    label: "پس‌زمینه صفحه",
    hint: "رنگ زمینه کل وب‌سایت.",
  },
  {
    name: "surfaceColor",
    label: "پس‌زمینه کارت‌ها",
    hint: "کارت‌ها، جدول‌ها و فرم‌ها.",
  },
  { name: "textColor", label: "رنگ متن", hint: "متن اصلی." },
  { name: "mutedColor", label: "رنگ متن کم‌رنگ", hint: "توضیحات و برچسب‌ها." },
  { name: "borderColor", label: "رنگ خطوط", hint: "حاشیه‌ها و جداکننده‌ها." },
];

function ColorInput({
  name,
  label,
  hint,
  value,
  onChange,
  isDefault,
}: {
  name: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  isDefault: boolean;
}) {
  return (
    <Field htmlFor={name} label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          id={name}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-14 shrink-0 cursor-pointer rounded-sm border border-line-2 bg-white p-1"
          aria-label={`انتخابگر رنگ ${label}`}
        />
        <Input
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          ltr
          placeholder="#000000"
        />
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_BRANDING[name as keyof BrandingSettings] as string)}
            aria-label={`بازگردانی ${label} به پیش‌فرض`}
            title="بازگردانی به پیش‌فرض"
            className="flex size-12 shrink-0 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-navy-500 hover:text-navy-800"
          >
            <Icon name="refresh" size={16} />
          </button>
        )}
      </div>
    </Field>
  );
}

export function BrandingForm({
  branding,
  csrfToken,
}: {
  branding: BrandingSettings;
  csrfToken: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveBrandingAction,
    idleState as FormState,
  );

  const [values, setValues] = useState<BrandingSettings>(branding);
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات ظاهری دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
  );

  const set = <K extends keyof BrandingSettings>(
    key: K,
    value: BrandingSettings[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const error = (name: string) => state.fieldErrors?.[name];
  const changed = COLOR_FIELDS.some(
    (field) => values[field.name] !== DEFAULT_BRANDING[field.name],
  );

  return (
    <form
      action={formAction}
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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <FormSection
            title="رنگ‌ها"
            description="رنگ‌های پیش‌فرض متناسب با طراحی وب‌سایت انتخاب شده‌اند. تغییر آن‌ها روی تمام صفحات اثر می‌گذارد."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {COLOR_FIELDS.map((field) => (
                <ColorInput
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  hint={field.hint}
                  value={values[field.name] as string}
                  onChange={(value) => set(field.name, value as never)}
                  isDefault={values[field.name] === DEFAULT_BRANDING[field.name]}
                />
              ))}
            </div>

            {changed && (
              <Alert tone="warning" title="نکته درباره خوانایی">
                پس از تغییر رنگ‌ها، پیش‌نمایش کنار صفحه را بررسی کنید. اگر
                اختلاف رنگ متن و پس‌زمینه کم باشد، متن برای برخی کاربران خوانا
                نخواهد بود.
              </Alert>
            )}
          </FormSection>

          <FormSection
            title="تایپوگرافی"
            description="اندازه و فاصله خطوط متن در کل وب‌سایت."
          >
            <Field
              htmlFor="fontFamily"
              label="فونت سفارشی"
              hint="خالی بگذارید تا فونت وزیرمتن (پیش‌فرض) استفاده شود. فونت وزیرمتن همیشه به‌عنوان جایگزین باقی می‌ماند."
              error={error("fontFamily")}
            >
              <Input
                id="fontFamily"
                name="fontFamily"
                value={values.fontFamily}
                onChange={(event) => set("fontFamily", event.target.value)}
                ltr
                placeholder='"IRANSans", "Yekan"'
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field
                htmlFor="baseFontSize"
                label="اندازه پایه متن"
                hint={`${fa(values.baseFontSize)} پیکسل`}
                error={error("baseFontSize")}
              >
                <input
                  id="baseFontSize"
                  name="baseFontSize"
                  type="range"
                  min={13}
                  max={20}
                  step={0.5}
                  value={values.baseFontSize}
                  onChange={(event) =>
                    set("baseFontSize", Number(event.target.value))
                  }
                  className="h-12 w-full accent-navy-900"
                />
              </Field>

              <Field
                htmlFor="lineHeight"
                label="فاصله خطوط"
                hint={fa(values.lineHeight)}
                error={error("lineHeight")}
              >
                <input
                  id="lineHeight"
                  name="lineHeight"
                  type="range"
                  min={1.4}
                  max={2.4}
                  step={0.05}
                  value={values.lineHeight}
                  onChange={(event) =>
                    set("lineHeight", Number(event.target.value))
                  }
                  className="h-12 w-full accent-navy-900"
                />
              </Field>

              <Field
                htmlFor="headingScale"
                label="مقیاس عناوین"
                hint={fa(values.headingScale)}
                error={error("headingScale")}
              >
                <input
                  id="headingScale"
                  name="headingScale"
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.05}
                  value={values.headingScale}
                  onChange={(event) =>
                    set("headingScale", Number(event.target.value))
                  }
                  className="h-12 w-full accent-navy-900"
                />
              </Field>
            </div>

            <Field
              htmlFor="cornerRadius"
              label="گردی گوشه‌ها"
              hint={`${fa(values.cornerRadius)} پیکسل — عدد کوچک، ظاهری رسمی‌تر.`}
              error={error("cornerRadius")}
            >
              <input
                id="cornerRadius"
                name="cornerRadius"
                type="range"
                min={0}
                max={24}
                step={1}
                value={values.cornerRadius}
                onChange={(event) =>
                  set("cornerRadius", Number(event.target.value))
                }
                className="h-12 w-full accent-navy-900"
              />
            </Field>
          </FormSection>
        </div>

        {/* -- live preview -------------------------------------------------- */}
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <p className="mb-3 flex items-center gap-2 text-[0.8125rem] font-semibold text-muted">
              <Icon name="eye" size={15} />
              پیش‌نمایش زنده
            </p>

            <div
              className="overflow-hidden rounded-sm border"
              style={{
                background: values.backgroundColor,
                borderColor: values.borderColor,
                fontFamily: values.fontFamily || undefined,
                fontSize: `${values.baseFontSize}px`,
                lineHeight: values.lineHeight,
              }}
            >
              <div
                className="px-5 py-4"
                style={{ background: values.primaryColor }}
              >
                <p
                  className="text-[0.75rem]"
                  style={{ color: values.accentColor }}
                >
                  مؤسسه داوری
                </p>
                <p className="mt-1 font-bold text-white">نمونه سربرگ سایت</p>
              </div>

              <div className="p-5">
                <p
                  style={{
                    color: values.accentColor,
                    fontSize: "0.8125em",
                    fontWeight: 600,
                  }}
                >
                  برچسب بخش
                </p>
                <h3
                  style={{
                    color: values.primaryColor,
                    fontSize: `${1.5 * values.headingScale}em`,
                    fontWeight: 700,
                    marginTop: "0.5rem",
                    lineHeight: 1.5,
                  }}
                >
                  عنوان نمونه برای بررسی خوانایی
                </h3>
                <p style={{ color: values.textColor, marginTop: "0.75rem" }}>
                  این متن نمونه‌ای از محتوای اصلی وب‌سایت است و با رنگ متن
                  انتخابی شما نمایش داده می‌شود.
                </p>
                <p
                  style={{
                    color: values.mutedColor,
                    marginTop: "0.5rem",
                    fontSize: "0.875em",
                  }}
                >
                  این متن کم‌رنگ برای توضیحات تکمیلی استفاده می‌شود.
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <span
                    className="inline-flex items-center px-5 py-2.5 font-medium text-white"
                    style={{
                      background: values.primaryColor,
                      borderRadius: `${values.cornerRadius}px`,
                      fontSize: "0.9375em",
                    }}
                  >
                    دکمه اصلی
                  </span>
                  <span
                    className="inline-flex items-center border px-5 py-2.5 font-medium"
                    style={{
                      borderColor: values.borderColor,
                      color: values.primaryColor,
                      borderRadius: `${values.cornerRadius}px`,
                      fontSize: "0.9375em",
                    }}
                  >
                    دکمه دوم
                  </span>
                </div>

                <div
                  className="mt-5 border p-4"
                  style={{
                    background: values.surfaceColor,
                    borderColor: values.borderColor,
                    borderRadius: `${values.cornerRadius}px`,
                  }}
                >
                  <p
                    style={{
                      color: values.primaryColor,
                      fontWeight: 700,
                      fontSize: "0.9375em",
                    }}
                  >
                    نمونه کارت
                  </p>
                  <p
                    style={{
                      color: values.mutedColor,
                      marginTop: "0.375rem",
                      fontSize: "0.8125em",
                    }}
                  >
                    کارت‌ها، جدول‌ها و فرم‌ها از این رنگ استفاده می‌کنند.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[0.75rem] leading-[1.9] text-muted">
              پیش‌نمایش تقریبی است. پس از ذخیره، تغییرات را در وب‌سایت اصلی نیز
              بررسی کنید.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <DirtyBadge dirty={dirty && state.status !== "success"} />
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setValues({ ...values, ...DEFAULT_BRANDING });
                setDirty(true);
              }}
            >
              بازگردانی همه به پیش‌فرض
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={pending}
              loadingText="در حال ذخیره…"
              className={cn("min-w-[9rem]")}
            >
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
