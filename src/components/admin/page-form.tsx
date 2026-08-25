"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentStatus, Page } from "@/types";
import { CONTENT_STATUS, CONTENT_STATUS_OPTIONS } from "@/lib/config/labels";
import { ROUTES } from "@/lib/config/routes";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { savePageAction } from "@/lib/actions/pages";
import { slugify } from "@/lib/utils/slug";
import { cn } from "@/lib/utils/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection, ToggleField } from "./form-shell";
import { useActionResult } from "./use-action-result";
import { MediaField } from "./media-picker";
import { DirtyBadge, useUnsavedChanges } from "./dialog";
import { SeoFieldset } from "./seo-fieldset";

/**
 * Page settings: title, address, publication state and SEO.
 *
 * Content lives in the section editor on the neighbouring tab; this form owns
 * everything *about* the page rather than what is on it. Splitting them keeps
 * either screen from becoming an unmanageable wall of inputs.
 */
export function PageForm({
  page,
  csrfToken,
}: {
  page?: Page;
  csrfToken: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(savePageAction, idleState as FormState<{ id: string }>);

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [status, setStatus] = useState<ContentStatus>(page?.status ?? "draft");
  const [scheduledFor, setScheduledFor] = useState(
    page?.scheduledFor ? page.scheduledFor.slice(0, 16) : "",
  );
  const [featuredImage, setFeaturedImage] = useState(page?.featuredImage ?? "");
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای دارید. اگر از این صفحه خارج شوید، این تغییرات از دست می‌رود.",
  );

  /**
   * A newly created page has nowhere to go but its own section editor — that
   * is the next thing the administrator wants, and the id only exists after
   * the save returns.
   */
  useActionResult(state, (result) => {
    if (result.status === "success") setDirty(false);
  });

  useEffect(() => {
    if (state.status !== "success") return;
    if (!page && state.payload?.id) {
      router.push(ROUTES.admin.pageSections(state.payload.id));
    }
  }, [state.status, state.submissionId, state.payload, page, router]);

  const error = (name: string) => state.fieldErrors?.[name];
  const touch = () => setDirty(true);

  return (
    <form
      action={formAction}
      onChange={touch}
      noValidate
      className="flex flex-col gap-6 pb-28"
    >
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      {page && <input type="hidden" name="id" value={page.id} />}

      {state.status !== "idle" && (
        <Alert
          tone={state.status === "success" ? "success" : "danger"}
          title={state.status === "success" ? "انجام شد" : "ذخیره‌سازی انجام نشد"}
        >
          {state.message}
        </Alert>
      )}

      {page?.system && (
        <Alert tone="info" title="صفحه سیستمی">
          {page.systemNote ??
            "این صفحه بخشی از ساختار سایت است. محتوا و سئوی آن قابل ویرایش است، اما نشانی آن ثابت می‌ماند و امکان حذف ندارد."}
        </Alert>
      )}

      <FormSection
        title="اطلاعات صفحه"
        description="عنوان و نشانی صفحه در وب‌سایت."
      >
        <Field
          htmlFor="title"
          label="عنوان صفحه"
          required
          error={error("title")}
        >
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              // Only auto-fill the slug while creating: rewriting a live URL
              // because someone fixed a typo in the title breaks inbound links.
              if (!page && !slug) setSlug(slugify(event.target.value));
            }}
            invalid={Boolean(error("title"))}
          />
        </Field>

        {!page?.system && (
          <Field
            htmlFor="slug"
            label="نامک (نشانی صفحه)"
            required
            hint={
              slug
                ? `نشانی نهایی: /${slug}`
                : "تنها حروف لاتین، اعداد و خط تیره."
            }
            error={error("slug")}
          >
            <div className="flex gap-2">
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                ltr
                placeholder="about-us"
                invalid={Boolean(error("slug"))}
              />
              <button
                type="button"
                onClick={() => setSlug(slugify(title))}
                className="flex h-12 shrink-0 items-center gap-2 rounded-sm border border-line-2 px-4 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white"
              >
                <Icon name="refresh" size={15} />
                تولید خودکار
              </button>
            </div>
          </Field>
        )}

        <Field
          htmlFor="excerpt"
          label="توضیح کوتاه"
          hint="در فهرست صفحات و به‌عنوان توضیح پیش‌فرض سئو استفاده می‌شود."
          error={error("excerpt")}
        >
          <Textarea
            id="excerpt"
            name="excerpt"
            rows={3}
            defaultValue={page?.excerpt ?? ""}
          />
        </Field>

        <MediaField
          name="featuredImage"
          label="تصویر شاخص"
          value={featuredImage}
          onChange={(value) => {
            setFeaturedImage(value);
            touch();
          }}
          csrfToken={csrfToken}
          hint="در اشتراک‌گذاری صفحه در شبکه‌های اجتماعی استفاده می‌شود."
        />
      </FormSection>

      <FormSection
        title="انتشار"
        description="تعیین کنید این صفحه چه زمانی روی وب‌سایت دیده شود."
      >
        <Field htmlFor="status" label="وضعیت" hint={CONTENT_STATUS[status].description}>
          <Select
            id="status"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ContentStatus)}
            options={CONTENT_STATUS_OPTIONS}
          />
        </Field>

        {status === "scheduled" && (
          <Field
            htmlFor="scheduledFor"
            label="تاریخ و ساعت انتشار"
            required
            hint="صفحه تا این زمان برای بازدیدکنندگان نمایش داده نمی‌شود."
            error={error("scheduledFor")}
          >
            <input
              id="scheduledFor"
              name="scheduledFor"
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              dir="ltr"
              className={cn(
                "min-h-12 w-full rounded-sm border bg-white px-4 py-3 text-[0.9375rem]",
                "focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]",
                error("scheduledFor") ? "border-danger/60" : "border-line-2",
              )}
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            name="showInNav"
            label="پیشنهاد در منوها"
            description="این صفحه در فهرست انتخاب پیوند منو و فوتر پیشنهاد می‌شود."
            defaultChecked={page?.showInNav ?? false}
          />

          <Field
            htmlFor="order"
            label="ترتیب"
            hint="عدد کوچک‌تر بالاتر قرار می‌گیرد."
          >
            <Input
              id="order"
              name="order"
              type="number"
              min={0}
              max={999}
              defaultValue={page?.order ?? 0}
              ltr
            />
          </Field>
        </div>
      </FormSection>

      <SeoFieldset
        seo={page?.seo}
        csrfToken={csrfToken}
        fallbackTitle={title}
        path={page ? (page.slug ? `/${page.slug}` : "/") : `/${slug}`}
        errors={state.fieldErrors}
        onChange={touch}
      />

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="hidden items-center gap-3 sm:flex">
            <DirtyBadge dirty={dirty && state.status !== "success"} />
            {!dirty && (
              <p className="flex items-center gap-2 text-[0.75rem] text-muted">
                <Icon name="info" size={14} className="text-gold-600" />
                محتوای صفحه در سربرگ «بخش‌ها» ویرایش می‌شود.
              </p>
            )}
          </div>

          <div className="flex flex-1 items-center justify-end gap-2.5">
            <ButtonLink href={ROUTES.admin.pages} variant="ghost" size="md">
              انصراف
            </ButtonLink>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={pending}
              loadingText="در حال ذخیره…"
              className="min-w-[9rem]"
            >
              {page ? "ذخیره تغییرات" : "ساخت صفحه"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
