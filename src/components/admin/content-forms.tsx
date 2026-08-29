"use client";

import { useState } from "react";
import type {
  Arbitrator,
  Article,
  Category,
  ContentStatus,
  FaqItem,
} from "@/types";
import { cn } from "@/lib/utils/cn";
import {
  saveArbitratorAction,
  saveArticleAction,
  saveFaqAction,
} from "@/lib/actions/admin";
import {
  CONTENT_STATUS,
  CONTENT_STATUS_OPTIONS,
  FAQ_TOPIC_OPTIONS,
} from "@/lib/config/labels";
import { CREDENTIAL_HINT, serializeCredentials } from "@/lib/cms/credentials";
import { ROUTES } from "@/lib/config/routes";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { FormSection, FormShell, SlugField, ToggleField } from "./form-shell";
import { MediaField } from "./media-picker";
import { RichTextEditor } from "./rich-text-editor";
import { SeoFieldset } from "./seo-fieldset";

/**
 * Content-management forms.
 *
 * Bodies are authored in the Markdown subset that `RichText` renders as React
 * elements — never as raw HTML — so an editor account cannot inject script
 * into the public site.
 *
 * Every image field goes through the media library rather than a bare URL
 * input: an administrator picks a file once and reuses it, and the CMS can
 * tell them where a file is in use before they delete it.
 */

/* -------------------------------------------------------------------------- */
/*  Publication controls                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Draft / published / scheduled / archived, with the schedule field appearing
 * only when it is relevant. Shared by every content form so the workflow
 * reads identically wherever it appears.
 */
function PublicationSection({
  status: initialStatus,
  scheduledFor,
  error,
  children,
}: {
  status?: ContentStatus;
  scheduledFor?: string;
  error: (name: string) => string[] | undefined;
  children?: React.ReactNode;
}) {
  const [status, setStatus] = useState<ContentStatus>(initialStatus ?? "draft");

  return (
    <FormSection
      title="وضعیت انتشار"
      description="تعیین کنید این محتوا چه زمانی روی وب‌سایت دیده شود."
    >
      <Field
        htmlFor="status"
        label="وضعیت"
        hint={CONTENT_STATUS[status].description}
      >
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
          hint="تا رسیدن این زمان، محتوا برای بازدیدکنندگان نمایش داده نمی‌شود."
          error={error("scheduledFor")}
        >
          <input
            id="scheduledFor"
            name="scheduledFor"
            type="datetime-local"
            defaultValue={scheduledFor ? scheduledFor.slice(0, 16) : ""}
            dir="ltr"
            className={cn(
              "min-h-12 w-full rounded-sm border bg-white px-4 py-3 text-[0.9375rem]",
              "focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]",
              error("scheduledFor") ? "border-danger/60" : "border-line-2",
            )}
          />
        </Field>
      )}

      {children}
    </FormSection>
  );
}

/* -------------------------------------------------------------------------- */
/*  Article                                                                   */
/* -------------------------------------------------------------------------- */

export function ArticleForm({
  csrfToken,
  article,
  categories,
}: {
  csrfToken: string;
  article?: Article;
  /** Live category list — categories are CMS records, not a fixed union. */
  categories: Category[];
}) {
  const [cover, setCover] = useState(article?.coverImage ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");

  return (
    <FormShell
      action={saveArticleAction}
      csrfToken={csrfToken}
      id={article?.id}
      submitLabel={article ? "ذخیره تغییرات" : "ثبت مقاله"}
      cancelHref={ROUTES.admin.articles}
      successRedirect={ROUTES.admin.articles}
    >
      {({ error }) => (
        <>
          <FormSection title="محتوای مقاله">
            <Field htmlFor="title" label="عنوان مقاله" required error={error("title")}>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                invalid={Boolean(error("title"))}
              />
            </Field>

            <SlugField
              defaultValue={article?.slug}
              sourceId="title"
              error={error("slug")}
            />

            <Field
              htmlFor="excerpt"
              label="خلاصه مقاله"
              required
              hint="در کارت مقاله و نتایج جست‌وجو نمایش داده می‌شود."
              error={error("excerpt")}
            >
              <Textarea
                id="excerpt"
                name="excerpt"
                rows={3}
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                required
                invalid={Boolean(error("excerpt"))}
              />
            </Field>

            <Field htmlFor="body" label="متن مقاله" required error={error("body")}>
              <RichTextEditor
                id="body"
                name="body"
                value={body}
                onChange={setBody}
                csrfToken={csrfToken}
                rows={22}
                invalid={Boolean(error("body"))}
              />
            </Field>
          </FormSection>

          <FormSection title="دسته‌بندی و تصویر شاخص">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                htmlFor="category"
                label="دسته‌بندی"
                required
                hint={
                  categories.length === 0
                    ? "هنوز دسته‌بندی‌ای ساخته نشده است."
                    : undefined
                }
                error={error("category")}
              >
                <Select
                  id="category"
                  name="category"
                  defaultValue={article?.category ?? categories[0]?.slug ?? ""}
                  options={categories.map((category) => ({
                    value: category.slug,
                    label: category.title,
                  }))}
                  placeholder={categories.length ? undefined : "دسته‌بندی موجود نیست"}
                />
              </Field>

              <Field
                htmlFor="authorName"
                label="نویسنده"
                required
                error={error("authorName")}
              >
                <Input
                  id="authorName"
                  name="authorName"
                  defaultValue={article?.authorName}
                  required
                  invalid={Boolean(error("authorName"))}
                />
              </Field>
            </div>

            <Field
              htmlFor="tags"
              label="برچسب‌ها"
              hint="برچسب‌ها را با ویرگول جدا کنید. حداکثر ۸ برچسب."
              error={error("tags")}
            >
              <Input
                id="tags"
                name="tags"
                defaultValue={article?.tags.join("، ")}
                placeholder="داوری، قرارداد، حل اختلاف"
                invalid={Boolean(error("tags"))}
              />
            </Field>

            <MediaField
              name="coverImage"
              label="تصویر شاخص"
              value={cover}
              onChange={setCover}
              csrfToken={csrfToken}
              hint="ابعاد پیشنهادی ۱۶:۱۰. در کارت مقاله و اشتراک‌گذاری استفاده می‌شود."
              error={error("coverImage")}
            />
          </FormSection>

          <SeoFieldset
            seo={article?.seo}
            csrfToken={csrfToken}
            fallbackTitle={title}
            fallbackDescription={excerpt}
            path={`/articles/${article?.slug ?? ""}`}
            errors={undefined}
          />

          <PublicationSection
            status={article?.status}
            scheduledFor={article?.scheduledFor}
            error={error}
          >
            <ToggleField
              name="featured"
              label="مقاله ویژه"
              description="مقالات ویژه در بالای صفحه مرکز دانش نمایش داده می‌شوند."
              defaultChecked={article?.featured ?? false}
            />
          </PublicationSection>
        </>
      )}
    </FormShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Arbitrator / person                                                       */
/* -------------------------------------------------------------------------- */

export function ArbitratorForm({
  csrfToken,
  arbitrator,
}: {
  csrfToken: string;
  arbitrator?: Arbitrator;
}) {
  const [photo, setPhoto] = useState(arbitrator?.photoUrl ?? "");
  const [biography, setBiography] = useState(arbitrator?.biography ?? "");
  const [fullName, setFullName] = useState(arbitrator?.fullName ?? "");
  const [shortBio, setShortBio] = useState(arbitrator?.shortBio ?? "");

  return (
    <FormShell
      action={saveArbitratorAction}
      csrfToken={csrfToken}
      id={arbitrator?.id}
      submitLabel={arbitrator ? "ذخیره تغییرات" : "ثبت پروفایل"}
      cancelHref={ROUTES.admin.arbitrators}
      successRedirect={ROUTES.admin.arbitrators}
    >
      {({ error }) => (
        <>
          <FormSection title="مشخصات فردی">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                htmlFor="fullName"
                label="نام و نام خانوادگی"
                required
                error={error("fullName")}
              >
                <Input
                  id="fullName"
                  name="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  invalid={Boolean(error("fullName"))}
                />
              </Field>

              <Field htmlFor="title" label="سمت" required error={error("title")}>
                <Input
                  id="title"
                  name="title"
                  defaultValue={arbitrator?.title}
                  placeholder="داور مؤسسه"
                  required
                  invalid={Boolean(error("title"))}
                />
              </Field>
            </div>

            <SlugField
              defaultValue={arbitrator?.slug}
              sourceId="fullName"
              error={error("slug")}
            />

            <MediaField
              name="photoUrl"
              label="تصویر پروفایل"
              value={photo}
              onChange={setPhoto}
              csrfToken={csrfToken}
              hint="اختیاری. در نبود تصویر، نشان اختصاصی مؤسسه نمایش داده می‌شود."
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <Field htmlFor="email" label="ایمیل" error={error("email")}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={arbitrator?.email ?? ""}
                  ltr
                  invalid={Boolean(error("email"))}
                />
              </Field>

              <Field
                htmlFor="yearsOfExperience"
                label="سال‌های سابقه"
                hint="عدد صفر یعنی نمایش داده نشود."
                error={error("yearsOfExperience")}
              >
                <Input
                  id="yearsOfExperience"
                  name="yearsOfExperience"
                  type="number"
                  min={0}
                  max={70}
                  defaultValue={arbitrator?.yearsOfExperience ?? 0}
                  ltr
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="معرفی">
            <Field
              htmlFor="shortBio"
              label="معرفی کوتاه"
              hint="در کارت پروفایل و بخش «اعضا» نمایش داده می‌شود."
              error={error("shortBio")}
            >
              <Textarea
                id="shortBio"
                name="shortBio"
                rows={3}
                value={shortBio}
                onChange={(event) => setShortBio(event.target.value)}
              />
            </Field>

            <Field htmlFor="biography" label="معرفی کامل" error={error("biography")}>
              <RichTextEditor
                id="biography"
                name="biography"
                value={biography}
                onChange={setBiography}
                csrfToken={csrfToken}
                rows={14}
              />
            </Field>

            <Field
              htmlFor="approach"
              label="رویکرد حرفه‌ای"
              error={error("approach")}
            >
              <Textarea
                id="approach"
                name="approach"
                rows={4}
                defaultValue={arbitrator?.approach ?? ""}
              />
            </Field>
          </FormSection>

          <FormSection
            title="تخصص و سوابق"
            description="هر مورد را در یک خط جداگانه بنویسید."
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Field htmlFor="expertise" label="تخصص‌ها" error={error("expertise")}>
                <Textarea
                  id="expertise"
                  name="expertise"
                  rows={5}
                  defaultValue={arbitrator?.expertise.join("\n")}
                />
              </Field>

              <Field
                htmlFor="practiceAreas"
                label="حوزه‌های فعالیت"
                error={error("practiceAreas")}
              >
                <Textarea
                  id="practiceAreas"
                  name="practiceAreas"
                  rows={5}
                  defaultValue={arbitrator?.practiceAreas.join("\n")}
                />
              </Field>
            </div>

            <Field
              htmlFor="education"
              label="تحصیلات"
              hint={CREDENTIAL_HINT}
              error={error("education")}
            >
              <Textarea
                id="education"
                name="education"
                rows={4}
                defaultValue={serializeCredentials(arbitrator?.education)}
                placeholder="دکتری حقوق خصوصی | دانشگاه تهران | ۱۳۹۰ تا ۱۳۹۵"
              />
            </Field>

            <Field
              htmlFor="background"
              label="سوابق حرفه‌ای"
              hint={CREDENTIAL_HINT}
              error={error("background")}
            >
              <Textarea
                id="background"
                name="background"
                rows={4}
                defaultValue={serializeCredentials(arbitrator?.background)}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field htmlFor="languages" label="زبان‌ها" error={error("languages")}>
                <Textarea
                  id="languages"
                  name="languages"
                  rows={3}
                  defaultValue={arbitrator?.languages.join("\n")}
                />
              </Field>

              <Field
                htmlFor="memberships"
                label="عضویت‌ها"
                error={error("memberships")}
              >
                <Textarea
                  id="memberships"
                  name="memberships"
                  rows={3}
                  defaultValue={arbitrator?.memberships.join("\n")}
                />
              </Field>
            </div>
          </FormSection>

          <SeoFieldset
            seo={arbitrator?.seo}
            csrfToken={csrfToken}
            fallbackTitle={fullName}
            fallbackDescription={shortBio}
            path={`/arbitrator/${arbitrator?.slug ?? ""}`}
          />

          <FormSection title="نمایش">
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleField
                name="published"
                label="نمایش در وب‌سایت"
                defaultChecked={arbitrator?.published ?? true}
              />
              <ToggleField
                name="bookable"
                label="پذیرش رزرو وقت"
                description="در فرم رزرو وقت مشاوره قابل انتخاب باشد."
                defaultChecked={arbitrator?.bookable ?? true}
              />
            </div>

            <Field
              htmlFor="order"
              label="ترتیب نمایش"
              hint="پروفایل با کمترین عدد، داور اصلی مؤسسه در نظر گرفته می‌شود."
              error={error("order")}
            >
              <Input
                id="order"
                name="order"
                type="number"
                min={0}
                max={999}
                defaultValue={arbitrator?.order ?? 0}
                ltr
              />
            </Field>
          </FormSection>
        </>
      )}
    </FormShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

export function FaqForm({
  csrfToken,
  faq,
  topics,
}: {
  csrfToken: string;
  faq?: FaqItem;
  /** Groups already in use, so an administrator can reuse or add one. */
  topics: string[];
}) {
  const options = [
    ...FAQ_TOPIC_OPTIONS,
    ...topics
      .filter(
        (topic) => !FAQ_TOPIC_OPTIONS.some((option) => option.value === topic),
      )
      .map((topic) => ({ value: topic, label: topic })),
  ];

  const [topic, setTopic] = useState(faq?.topic ?? options[0]?.value ?? "general");
  const [custom, setCustom] = useState(false);

  return (
    <FormShell
      action={saveFaqAction}
      csrfToken={csrfToken}
      id={faq?.id}
      submitLabel={faq ? "ذخیره تغییرات" : "ثبت پرسش"}
      cancelHref={ROUTES.admin.faq}
      successRedirect={ROUTES.admin.faq}
    >
      {({ error }) => (
        <>
          <FormSection title="پرسش و پاسخ">
            <Field htmlFor="question" label="پرسش" required error={error("question")}>
              <Input
                id="question"
                name="question"
                defaultValue={faq?.question}
                required
                invalid={Boolean(error("question"))}
              />
            </Field>

            <Field htmlFor="answer" label="پاسخ" required error={error("answer")}>
              <Textarea
                id="answer"
                name="answer"
                rows={7}
                defaultValue={faq?.answer}
                required
                invalid={Boolean(error("answer"))}
              />
            </Field>
          </FormSection>

          <FormSection title="دسته‌بندی و نمایش">
            <input type="hidden" name="topic" value={topic} />

            <Field
              htmlFor="topic-select"
              label="دسته"
              hint="پرسش‌ها در صفحه پرسش‌های متداول بر اساس همین دسته گروه‌بندی می‌شوند."
              error={error("topic")}
            >
              {custom ? (
                <div className="flex gap-2">
                  <Input
                    id="topic-select"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="نام دسته جدید"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustom(false);
                      setTopic(options[0]?.value ?? "general");
                    }}
                    className="flex h-12 shrink-0 items-center rounded-sm border border-line-2 px-4 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
                  >
                    انصراف
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    id="topic-select"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    options={options}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustom(true);
                      setTopic("");
                    }}
                    className="flex h-12 shrink-0 items-center gap-2 rounded-sm border border-line-2 px-4 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
                  >
                    <Icon name="plus" size={15} />
                    دسته جدید
                  </button>
                </div>
              )}
            </Field>

            <Field
              htmlFor="order"
              label="ترتیب نمایش"
              hint="عدد کوچک‌تر، بالاتر نمایش داده می‌شود."
              error={error("order")}
            >
              <Input
                id="order"
                name="order"
                type="number"
                min={0}
                max={999}
                defaultValue={faq?.order ?? 0}
                ltr
              />
            </Field>

            <ToggleField
              name="published"
              label="نمایش در وب‌سایت"
              defaultChecked={faq?.published ?? true}
            />
          </FormSection>
        </>
      )}
    </FormShell>
  );
}
