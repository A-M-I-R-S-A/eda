"use client";

import { useState } from "react";
import Image from "next/image";
import type { Testimonial } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import {
  deleteTestimonialAction,
  reorderTestimonialsAction,
  saveTestimonialAction,
} from "@/lib/actions/taxonomy";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { CollectionManager } from "./collection-manager";
import { MediaField } from "./media-picker";
import { ReorderPanel } from "./reorder-panel";
import { ToggleField } from "./form-shell";
import { Panel } from "./ui";

/**
 * Testimonials.
 *
 * A testimonial is a claim that a named person said something about this
 * institution, so nothing is seeded and nothing is invented — the section on
 * the public site renders its empty state until real ones are entered here.
 */

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          aria-label={`${star} ستاره`}
          aria-pressed={star <= value}
          className="rounded-xs p-0.5 transition-transform hover:scale-110"
        >
          <Icon
            name={star <= value ? "star-filled" : "star"}
            size={22}
            className={star <= value ? "text-gold-500" : "text-line-2"}
          />
        </button>
      ))}
      <span className="ms-2 text-[0.8125rem] text-muted">
        {value === 0 ? "بدون امتیاز" : `${fa(value)} از ۵`}
      </span>
    </div>
  );
}

function TestimonialFields({
  testimonial,
  csrfToken,
  error,
}: {
  testimonial?: Testimonial;
  csrfToken: string;
  error: (name: string) => string[] | undefined;
}) {
  const [photo, setPhoto] = useState(testimonial?.photoUrl ?? "");
  const [rating, setRating] = useState(testimonial?.rating ?? 5);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="t-name"
          label="نام"
          required
          error={error("authorName")}
        >
          <Input
            id="t-name"
            name="authorName"
            defaultValue={testimonial?.authorName}
            required
          />
        </Field>

        <Field htmlFor="t-title" label="سمت یا شرکت" error={error("authorTitle")}>
          <Input
            id="t-title"
            name="authorTitle"
            defaultValue={testimonial?.authorTitle ?? ""}
            placeholder="مدیرعامل شرکت …"
          />
        </Field>
      </div>

      <Field htmlFor="t-quote" label="متن نظر" required error={error("quote")}>
        <Textarea
          id="t-quote"
          name="quote"
          rows={5}
          defaultValue={testimonial?.quote}
          required
        />
      </Field>

      <MediaField
        name="photoUrl"
        label="تصویر"
        value={photo}
        onChange={setPhoto}
        csrfToken={csrfToken}
        hint="اختیاری. در نبود تصویر، حرف اول نام نمایش داده می‌شود."
      />

      <Field label="امتیاز" hint="برای پنهان کردن ستاره‌ها، امتیاز را صفر کنید.">
        <input type="hidden" name="rating" value={rating} />
        <StarInput value={rating} onChange={setRating} />
      </Field>

      <input type="hidden" name="order" value={testimonial?.order ?? 0} />

      <ToggleField
        name="published"
        label="نمایش در وب‌سایت"
        defaultChecked={testimonial?.published ?? true}
      />
    </>
  );
}

export function TestimonialManager({
  testimonials,
  csrfToken,
}: {
  testimonials: Testimonial[];
  csrfToken: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="نظرات"
        description="نظرات ثبت‌شده در بخش «نظرات» صفحات نمایش داده می‌شوند."
      >
        <CollectionManager
          items={testimonials}
          csrfToken={csrfToken}
          saveAction={saveTestimonialAction}
          deleteAction={deleteTestimonialAction}
          getId={(item) => item.id}
          getLabel={(item) => item.authorName}
          emptyIcon="quote"
          labels={{
            addButton: "افزودن نظر",
            createTitle: "ثبت نظر جدید",
            editTitle: "ویرایش نظر",
            deleteTitle: "حذف نظر",
            deleteMessage: (label) => (
              <>
                نظر «<span className="font-semibold">{label}</span>» برای همیشه
                حذف می‌شود. اگر فقط می‌خواهید موقتاً نمایش داده نشود، به‌جای حذف
                گزینه «نمایش در وب‌سایت» را خاموش کنید.
              </>
            ),
            emptyTitle: "هنوز نظری ثبت نشده است",
            emptyDescription:
              "نظرات واقعی مراجعان را از اینجا اضافه کنید. تا زمانی که نظری ثبت نشود، بخش نظرات در وب‌سایت خالی می‌ماند.",
          }}
          renderForm={(testimonial, helpers) => (
            <TestimonialFields
              testimonial={testimonial}
              csrfToken={helpers.csrfToken}
              error={helpers.error}
            />
          )}
          renderRow={(testimonial) => (
            <div className="flex min-w-0 items-center gap-3">
              {testimonial.photoUrl ? (
                <Image
                  src={testimonial.photoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[0.8125rem] font-bold text-gold-200">
                  {testimonial.authorName.trim().slice(0, 1)}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[0.9375rem] font-semibold text-navy-900">
                    {testimonial.authorName}
                  </span>
                  {!testimonial.published && (
                    <span className="shrink-0 rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.625rem] text-muted">
                      پنهان
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
                  {testimonial.authorTitle || testimonial.quote}
                </span>
              </span>

              {testimonial.rating > 0 && (
                <span className="hidden shrink-0 items-center gap-0.5 sm:flex">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Icon
                      key={index}
                      name={index < testimonial.rating ? "star-filled" : "star"}
                      size={13}
                      className={cn(
                        index < testimonial.rating
                          ? "text-gold-500"
                          : "text-line-2",
                      )}
                    />
                  ))}
                </span>
              )}
            </div>
          )}
        />
      </Panel>

      {testimonials.length > 1 && (
        <Panel title="ترتیب نمایش">
          <ReorderPanel
            items={testimonials}
            action={reorderTestimonialsAction}
            csrfToken={csrfToken}
            itemLabel={(item) => item.authorName}
            renderItem={(item) => (
              <span className="truncate text-[0.875rem] font-medium text-navy-900">
                {item.authorName}
              </span>
            )}
          />
        </Panel>
      )}
    </div>
  );
}
