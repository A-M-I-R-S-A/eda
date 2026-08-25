"use client";

import { useActionState, useState } from "react";
import type { HeaderSettings, Page } from "@/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveHeaderAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection, ToggleField } from "./form-shell";
import { MediaField } from "./media-picker";
import { NavEditor } from "./nav-editor";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * Header settings.
 *
 * Everything the site header renders is edited here: the logo, the descriptor
 * beside it, the main navigation, the utility strip, the call-to-action and
 * the mobile drawer. No part of the header reads a hard-coded array any more.
 */

const STYLE_OPTIONS = [
  { value: "classic", label: "کلاسیک — با سایه هنگام اسکرول" },
  { value: "minimal", label: "ساده — بدون حاشیه و سایه" },
  { value: "bordered", label: "خط‌دار — با خط تیره در پایین" },
];

export function HeaderForm({
  header,
  pages,
  csrfToken,
}: {
  header: HeaderSettings;
  pages: Pick<Page, "id" | "title" | "slug">[];
  csrfToken: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveHeaderAction,
    idleState as FormState,
  );

  const [logo, setLogo] = useState(header.logoUrl ?? "");
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات هدر دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
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

      {state.status !== "idle" && (
        <Alert
          tone={state.status === "success" ? "success" : "danger"}
          title={state.status === "success" ? "انجام شد" : "ذخیره‌سازی انجام نشد"}
        >
          {state.message}
        </Alert>
      )}

      <FormSection
        title="نشان و هویت"
        description="لوگو و متنی که در کنار آن نمایش داده می‌شود."
      >
        <MediaField
          name="logoUrl"
          label="لوگوی هدر"
          value={logo}
          onChange={(value) => {
            setLogo(value);
            setDirty(true);
          }}
          csrfToken={csrfToken}
          hint="خالی بگذارید تا نشان اختصاصی مؤسسه (مونوگرام) نمایش داده شود."
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            htmlFor="logoHeight"
            label="ارتفاع لوگو (پیکسل)"
            hint="بین ۲۰ تا ۱۲۰ پیکسل."
            error={error("logoHeight")}
          >
            <Input
              id="logoHeight"
              name="logoHeight"
              type="number"
              min={20}
              max={120}
              defaultValue={header.logoHeight}
              ltr
            />
          </Field>

          <Field
            htmlFor="descriptor"
            label="توضیح کنار نام"
            hint="مثلاً: داوری و خدمات حقوقی تخصصی"
            error={error("descriptor")}
          >
            <Input
              id="descriptor"
              name="descriptor"
              defaultValue={header.descriptor}
            />
          </Field>
        </div>

        <ToggleField
          name="showWordmark"
          label="نمایش نام مؤسسه کنار لوگو"
          defaultChecked={header.showWordmark}
        />
      </FormSection>

      <FormSection
        title="منوی اصلی"
        description="پیوندهای نوار بالای وب‌سایت. با کشیدن یا دکمه‌های بالا و پایین، ترتیب را تغییر دهید."
      >
        <NavEditor
          prefix="nav"
          label="پیوندهای منو"
          links={header.nav}
          pages={pages}
          max={12}
        />
      </FormSection>

      <FormSection
        title="دکمه اقدام"
        description="دکمه برجسته سمت چپ نوار بالا."
      >
        <ToggleField
          name="ctaVisible"
          label="نمایش دکمه اقدام"
          defaultChecked={header.ctaVisible}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Field htmlFor="ctaLabel" label="متن دکمه" error={error("ctaLabel")}>
            <Input
              id="ctaLabel"
              name="ctaLabel"
              defaultValue={header.ctaLabel}
              placeholder="رزرو وقت"
            />
          </Field>

          <Field htmlFor="ctaHref" label="نشانی دکمه" error={error("ctaHref")}>
            <Input
              id="ctaHref"
              name="ctaHref"
              defaultValue={header.ctaHref}
              ltr
              placeholder="/appointment"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="نوار اطلاعات بالایی"
        description="نوار باریک بالای هدر که هنگام اسکرول جمع می‌شود."
      >
        <ToggleField
          name="showUtilityBar"
          label="نمایش نوار اطلاعات"
          defaultChecked={header.showUtilityBar}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            name="showPhone"
            label="نمایش شماره تماس"
            description="شماره اصلی از تنظیمات سایت خوانده می‌شود."
            defaultChecked={header.showPhone}
          />
          <ToggleField
            name="showHours"
            label="نمایش ساعات کاری"
            description="نخستین مورد از ساعات کاری تنظیمات سایت."
            defaultChecked={header.showHours}
          />
        </div>

        <NavEditor
          prefix="utility"
          label="پیوندهای نوار بالایی"
          links={header.utilityLinks}
          pages={pages}
          max={6}
        />
      </FormSection>

      <FormSection
        title="منوی موبایل"
        description="کشوی ناوبری در نمایشگرهای کوچک."
      >
        <ToggleField
          name="mobileMenuEnabled"
          label="فعال بودن منوی موبایل"
          defaultChecked={header.mobileMenuEnabled}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Field htmlFor="mobileCtaLabel" label="متن دکمه پایین منو">
            <Input
              id="mobileCtaLabel"
              name="mobileCtaLabel"
              defaultValue={header.mobileCtaLabel}
            />
          </Field>

          <Field htmlFor="mobileCtaHref" label="نشانی دکمه پایین منو">
            <Input
              id="mobileCtaHref"
              name="mobileCtaHref"
              defaultValue={header.mobileCtaHref}
              ltr
            />
          </Field>
        </div>

        <NavEditor
          prefix="quick"
          label="کارت‌های دسترسی سریع"
          description="زیر منوی موبایل نمایش داده می‌شوند و می‌توانند توضیح کوتاه داشته باشند."
          links={header.mobileQuickLinks}
          pages={pages}
          withDescription
          max={6}
        />
      </FormSection>

      <FormSection title="ظاهر">
        <Field htmlFor="style" label="سبک هدر">
          <Select
            id="style"
            name="style"
            defaultValue={header.style}
            options={STYLE_OPTIONS}
          />
        </Field>

        <ToggleField
          name="sticky"
          label="چسبیدن هدر به بالای صفحه"
          description="هنگام اسکرول، هدر در بالای صفحه باقی می‌ماند."
          defaultChecked={header.sticky}
        />
      </FormSection>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="hidden items-center gap-3 sm:flex">
            <DirtyBadge dirty={dirty && state.status !== "success"} />
            <p className="flex items-center gap-2 text-[0.75rem] text-muted">
              <Icon name="info" size={14} className="text-gold-600" />
              تغییرات پس از ذخیره در تمام صفحات اعمال می‌شود.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={pending}
            loadingText="در حال ذخیره…"
            className="ms-auto min-w-[9rem]"
          >
            ذخیره تغییرات
          </Button>
        </div>
      </div>
    </form>
  );
}
