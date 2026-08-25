"use client";

import { useActionState, useState } from "react";
import type { SeoSettings } from "@/types";
import { SITE_URL } from "@/lib/seo/metadata";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveSeoSettingsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection, ToggleField } from "./form-shell";
import { MediaField } from "./media-picker";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * Site-wide SEO defaults.
 *
 * These fill in wherever a page, article or service has left its own SEO
 * fields empty, so an administrator can write meta text once and have every
 * new piece of content inherit something sensible.
 *
 * Turning indexing off here is a genuine site-wide switch: it produces a real
 * `Disallow: /` in `robots.txt`, empties the sitemap and forces `noindex` on
 * every page — a single page cannot opt back in.
 */
export function SeoSettingsForm({
  seo,
  csrfToken,
}: {
  seo: SeoSettings;
  csrfToken: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveSeoSettingsAction,
    idleState as FormState,
  );

  const [ogImage, setOgImage] = useState(seo.defaultOgImage ?? "");
  const [template, setTemplate] = useState(seo.titleTemplate);
  const [indexSite, setIndexSite] = useState(seo.indexSite);
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات سئو دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
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

      {!indexSite && (
        <Alert tone="warning" title="وب‌سایت از دید موتورهای جست‌وجو پنهان است">
          با غیرفعال بودن نمایه‌سازی، فایل robots.txt دسترسی همه خزنده‌ها را
          می‌بندد، نقشه سایت خالی می‌شود و تمام صفحات با برچسب noindex منتشر
          می‌شوند. این حالت برای نسخه آزمایشی مناسب است، نه برای سایت زنده.
        </Alert>
      )}

      <FormSection
        title="عنوان و توضیح پیش‌فرض"
        description="هر صفحه‌ای که عنوان یا توضیح سئوی اختصاصی نداشته باشد، از این مقادیر استفاده می‌کند."
      >
        <Field
          htmlFor="defaultTitle"
          label="عنوان پیش‌فرض سایت"
          required
          error={error("defaultTitle")}
        >
          <Input
            id="defaultTitle"
            name="defaultTitle"
            defaultValue={seo.defaultTitle}
            required
            invalid={Boolean(error("defaultTitle"))}
          />
        </Field>

        <Field
          htmlFor="titleTemplate"
          label="الگوی عنوان صفحات"
          required
          hint={
            <>
              عبارت <bdi dir="ltr">%s</bdi> با عنوان هر صفحه جایگزین می‌شود.
              نتیجه: <span className="font-medium text-navy-800">
                {template.replace("%s", "درباره ما")}
              </span>
            </>
          }
          error={error("titleTemplate")}
        >
          <Input
            id="titleTemplate"
            name="titleTemplate"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            required
            invalid={Boolean(error("titleTemplate"))}
          />
        </Field>

        <Field
          htmlFor="defaultDescription"
          label="توضیحات پیش‌فرض"
          required
          hint="توضیح کوتاهی از کل وب‌سایت. حداکثر حدود ۱۶۰ نویسه."
          error={error("defaultDescription")}
        >
          <Textarea
            id="defaultDescription"
            name="defaultDescription"
            rows={3}
            defaultValue={seo.defaultDescription}
            required
            invalid={Boolean(error("defaultDescription"))}
          />
        </Field>

        <Field
          htmlFor="keywords"
          label="کلیدواژه‌ها"
          hint="با ویرگول جدا کنید. حداکثر ۳۰ کلیدواژه."
          error={error("keywords")}
        >
          <Textarea
            id="keywords"
            name="keywords"
            rows={3}
            defaultValue={seo.keywords.join("، ")}
          />
        </Field>
      </FormSection>

      <FormSection
        title="اشتراک‌گذاری در شبکه‌های اجتماعی"
        description="تصویر و شناسه‌ای که هنگام اشتراک پیوندهای سایت نمایش داده می‌شود."
      >
        <MediaField
          name="defaultOgImage"
          label="تصویر پیش‌فرض اشتراک‌گذاری"
          value={ogImage}
          onChange={(value) => {
            setOgImage(value);
            setDirty(true);
          }}
          csrfToken={csrfToken}
          hint="ابعاد پیشنهادی ۱۲۰۰×۶۳۰ پیکسل."
        />

        <Field
          htmlFor="twitterHandle"
          label="شناسه ایکس (توییتر)"
          hint="با @ شروع می‌شود. اختیاری."
          error={error("twitterHandle")}
        >
          <Input
            id="twitterHandle"
            name="twitterHandle"
            defaultValue={seo.twitterHandle ?? ""}
            ltr
            placeholder="@example"
          />
        </Field>
      </FormSection>

      <FormSection
        title="نمایه‌سازی و خزنده‌ها"
        description="کنترل دسترسی موتورهای جست‌وجو به کل وب‌سایت."
      >
        <label className="flex cursor-pointer items-start justify-between gap-5 rounded-sm border border-line-2 bg-white p-4">
          <span className="min-w-0">
            <span className="block text-[0.875rem] font-semibold text-navy-900">
              اجازه نمایه‌سازی سایت
            </span>
            <span className="mt-1 block text-[0.8125rem] leading-[1.9] text-muted">
              در حالت خاموش، وب‌سایت در نتایج جست‌وجو نمایش داده نمی‌شود.
            </span>
          </span>
          <span className="relative mt-0.5 inline-flex shrink-0">
            <input
              type="checkbox"
              name="indexSite"
              checked={indexSite}
              onChange={(event) => {
                setIndexSite(event.target.checked);
                setDirty(true);
              }}
              className="peer size-0 opacity-0"
            />
            <span
              aria-hidden="true"
              className="block h-6 w-11 rounded-full bg-line-2 transition-colors duration-250 peer-checked:bg-navy-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-500"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-250 ease-[var(--ease-out-quint)] peer-checked:-translate-x-5"
            />
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            name="followLinks"
            label="دنبال کردن پیوندها"
            description="خزنده‌ها پیوندهای داخل صفحات را دنبال می‌کنند."
            defaultChecked={seo.followLinks}
          />
          <ToggleField
            name="sitemapEnabled"
            label="تولید نقشه سایت"
            description="فایل sitemap.xml به‌صورت خودکار از محتوای منتشرشده ساخته می‌شود."
            defaultChecked={seo.sitemapEnabled}
          />
        </div>

        <Field
          htmlFor="robotsExtra"
          label="دستورهای اضافی robots.txt"
          hint="هر دستور در یک خط. برای موارد خاص؛ در حالت عادی نیازی نیست."
          error={error("robotsExtra")}
        >
          <Textarea
            id="robotsExtra"
            name="robotsExtra"
            rows={4}
            defaultValue={seo.robotsExtra}
            dir="ltr"
            className="font-mono text-[0.8125rem] text-start"
            placeholder="Disallow: /private"
          />
        </Field>

        <div className="flex flex-wrap gap-2.5">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-line-2 px-3.5 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
          >
            <Icon name="external" size={15} />
            مشاهده نقشه سایت
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-line-2 px-3.5 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
          >
            <Icon name="external" size={15} />
            مشاهده robots.txt
          </a>
          <span className="inline-flex h-10 items-center gap-2 rounded-sm bg-paper-2 px-3.5 text-[0.8125rem] text-muted">
            <Icon name="link" size={15} />
            <bdi dir="ltr">{SITE_URL}</bdi>
          </span>
        </div>
      </FormSection>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <DirtyBadge dirty={dirty && state.status !== "success"} />
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
