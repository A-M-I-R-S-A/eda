"use client";

import { useState } from "react";
import type { SeoFields } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { SITE_URL } from "@/lib/seo/metadata";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { FormSection, ToggleField } from "./form-shell";
import { MediaField } from "./media-picker";

/**
 * The SEO block shared by pages and articles.
 *
 * Two things earn their place here:
 *
 *  • **A live search preview.** Meta text is written blind otherwise — a
 *    counter alone does not show that a 68-character title will still be cut
 *    off in a real result.
 *  • **Empty means inherit.** Every field falls back to the entity's own
 *    title/excerpt and then to the global defaults, so leaving the panel
 *    untouched is a valid, well-formed outcome rather than a gap.
 */

/** Google truncates around these lengths; over is a warning, not an error. */
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 158;

function CharacterCount({ value, limit }: { value: string; limit: number }) {
  const length = value.trim().length;
  const over = length > limit;

  return (
    <span
      className={cn(
        "text-[0.75rem] tabular-nums",
        over ? "font-medium text-warning" : "text-muted-2",
      )}
    >
      {fa(length)} / {fa(limit)}
      {over && " — احتمال کوتاه شدن در نتایج جست‌وجو"}
    </span>
  );
}

export function SeoFieldset({
  seo,
  csrfToken,
  fallbackTitle,
  fallbackDescription = "",
  path,
  errors,
  onChange,
}: {
  seo?: Partial<SeoFields>;
  csrfToken: string;
  /** Used in the preview when no meta title has been written. */
  fallbackTitle: string;
  fallbackDescription?: string;
  path: string;
  errors?: Record<string, string[]>;
  onChange?: () => void;
}) {
  const [metaTitle, setMetaTitle] = useState(seo?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    seo?.metaDescription ?? "",
  );
  const [ogImage, setOgImage] = useState(seo?.ogImage ?? "");
  const [advanced, setAdvanced] = useState(
    Boolean(seo?.canonicalPath || seo?.ogTitle || seo?.ogDescription),
  );

  const previewTitle = metaTitle.trim() || fallbackTitle || "عنوان صفحه";
  const previewDescription =
    metaDescription.trim() ||
    fallbackDescription.trim() ||
    "توضیحی وارد نشده است؛ توضیح پیش‌فرض سایت استفاده می‌شود.";

  const error = (name: string) => errors?.[`seo.${name}`] ?? errors?.[name];

  return (
    <FormSection
      title="سئو و اشتراک‌گذاری"
      description="اگر این فیلدها را خالی بگذارید، از عنوان و توضیح خود صفحه و سپس تنظیمات پیش‌فرض سئو استفاده می‌شود."
    >
      {/* -- search preview ------------------------------------------------ */}
      <div className="rounded-sm border border-line-2 bg-paper-2/50 p-4">
        <p className="mb-3 flex items-center gap-2 text-[0.75rem] font-semibold text-muted">
          <Icon name="search" size={14} />
          پیش‌نمایش نتیجه جست‌وجو
        </p>
        <div className="rounded-sm bg-white p-4">
          <p dir="ltr" className="truncate text-start text-[0.75rem] text-success">
            {SITE_URL}
            {path}
          </p>
          <p className="mt-1 line-clamp-1 text-[1.0625rem] font-medium text-info">
            {previewTitle}
          </p>
          <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-[1.9] text-muted">
            {previewDescription}
          </p>
        </div>
      </div>

      <Field
        htmlFor="metaTitle"
        label="عنوان سئو"
        hint={<CharacterCount value={metaTitle} limit={TITLE_LIMIT} />}
        error={error("metaTitle")}
      >
        <Input
          id="metaTitle"
          name="metaTitle"
          value={metaTitle}
          onChange={(event) => {
            setMetaTitle(event.target.value);
            onChange?.();
          }}
          placeholder={fallbackTitle}
        />
      </Field>

      <Field
        htmlFor="metaDescription"
        label="توضیحات متا"
        hint={
          <CharacterCount value={metaDescription} limit={DESCRIPTION_LIMIT} />
        }
        error={error("metaDescription")}
      >
        <Textarea
          id="metaDescription"
          name="metaDescription"
          rows={3}
          value={metaDescription}
          onChange={(event) => {
            setMetaDescription(event.target.value);
            onChange?.();
          }}
        />
      </Field>

      <MediaField
        name="ogImage"
        label="تصویر اشتراک‌گذاری"
        value={ogImage}
        onChange={(value) => {
          setOgImage(value);
          onChange?.();
        }}
        csrfToken={csrfToken}
        hint="ابعاد پیشنهادی ۱۲۰۰×۶۳۰ پیکسل. خالی بگذارید تا تصویر شاخص یا تصویر پیش‌فرض سایت استفاده شود."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          name="noindex"
          label="عدم نمایه‌سازی (noindex)"
          description="این صفحه در نتایج موتورهای جست‌وجو نمایش داده نمی‌شود."
          defaultChecked={seo?.noindex ?? false}
        />
        <ToggleField
          name="nofollow"
          label="عدم دنبال کردن پیوندها (nofollow)"
          description="موتورهای جست‌وجو پیوندهای این صفحه را دنبال نمی‌کنند."
          defaultChecked={seo?.nofollow ?? false}
        />
      </div>

      {/* -- advanced ------------------------------------------------------ */}
      <div className="border-t border-line pt-5">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="flex items-center gap-2 text-[0.875rem] font-medium text-navy-800 transition-colors hover:text-navy-950"
        >
          <Icon name={advanced ? "chevron-up" : "chevron-down"} size={16} />
          تنظیمات پیشرفته سئو
        </button>

        {advanced && (
          <div className="mt-5 flex flex-col gap-5">
            <Field
              htmlFor="canonicalPath"
              label="نشانی متعارف (Canonical)"
              hint="فقط در صورتی پر کنید که این محتوا نسخه اصلی نیست. خالی یعنی همین صفحه."
              error={error("canonicalPath")}
            >
              <Input
                id="canonicalPath"
                name="canonicalPath"
                defaultValue={seo?.canonicalPath ?? ""}
                ltr
                placeholder={path}
              />
            </Field>

            <Field
              htmlFor="ogTitle"
              label="عنوان اشتراک‌گذاری"
              hint="عنوان هنگام اشتراک در شبکه‌های اجتماعی. خالی یعنی همان عنوان سئو."
            >
              <Input
                id="ogTitle"
                name="ogTitle"
                defaultValue={seo?.ogTitle ?? ""}
              />
            </Field>

            <Field
              htmlFor="ogDescription"
              label="توضیح اشتراک‌گذاری"
              hint="خالی یعنی همان توضیحات متا."
            >
              <Textarea
                id="ogDescription"
                name="ogDescription"
                rows={2}
                defaultValue={seo?.ogDescription ?? ""}
              />
            </Field>
          </div>
        )}
      </div>
    </FormSection>
  );
}
