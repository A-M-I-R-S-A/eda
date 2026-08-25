"use client";

import { useState } from "react";
import type { Category } from "@/types";
import { slugify } from "@/lib/utils/slug";
import { fa } from "@/lib/utils/persian";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
  saveCategoryAction,
} from "@/lib/actions/taxonomy";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { CollectionManager } from "./collection-manager";
import { MediaField } from "./media-picker";
import { ReorderPanel } from "./reorder-panel";
import { ToggleField } from "./form-shell";
import { Panel } from "./ui";

/**
 * Article categories.
 *
 * Renaming a category's slug carries its articles along (the repository
 * handles that), and deleting one is refused while articles still point at it
 * — silently orphaning content is worse than making the administrator
 * reassign it first.
 */

function CategoryFields({
  category,
  csrfToken,
  error,
}: {
  category?: Category;
  csrfToken: string;
  error: (name: string) => string[] | undefined;
}) {
  const [title, setTitle] = useState(category?.title ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [image, setImage] = useState(category?.imageUrl ?? "");

  return (
    <>
      <Field htmlFor="cat-title" label="نام دسته‌بندی" required error={error("title")}>
        <Input
          id="cat-title"
          name="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            // Only while creating: changing a live slug would break the
            // category's own URL and every link pointing at it.
            if (!category) setSlug(slugify(event.target.value));
          }}
          required
        />
      </Field>

      <Field
        htmlFor="cat-slug"
        label="نامک"
        required
        hint="در نشانی فیلتر مقالات استفاده می‌شود."
        error={error("slug")}
      >
        <Input
          id="cat-slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          ltr
          placeholder="commercial-law"
          required
        />
      </Field>

      <Field htmlFor="cat-description" label="توضیح" error={error("description")}>
        <Textarea
          id="cat-description"
          name="description"
          rows={3}
          defaultValue={category?.description ?? ""}
        />
      </Field>

      <MediaField
        name="imageUrl"
        label="تصویر دسته‌بندی"
        value={image}
        onChange={setImage}
        csrfToken={csrfToken}
        hint="اختیاری."
      />

      <input type="hidden" name="order" value={category?.order ?? 0} />

      <ToggleField
        name="published"
        label="نمایش در وب‌سایت"
        defaultChecked={category?.published ?? true}
      />
    </>
  );
}

export function CategoryManager({
  categories,
  counts,
  csrfToken,
}: {
  categories: Category[];
  /** Article count per category slug, for the row summary. */
  counts: Record<string, number>;
  csrfToken: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="دسته‌بندی مقالات"
        description="دسته‌بندی‌ها در فیلتر صفحه مقالات و در بخش‌های «مقالات» صفحات استفاده می‌شوند."
      >
        <CollectionManager
          items={categories}
          csrfToken={csrfToken}
          saveAction={saveCategoryAction}
          deleteAction={deleteCategoryAction}
          getId={(category) => category.id}
          getLabel={(category) => category.title}
          emptyIcon="tag"
          labels={{
            addButton: "دسته‌بندی جدید",
            createTitle: "افزودن دسته‌بندی",
            editTitle: "ویرایش دسته‌بندی",
            deleteTitle: "حذف دسته‌بندی",
            deleteMessage: (label) => (
              <>
                دسته‌بندی «<span className="font-semibold">{label}</span>» حذف
                می‌شود.
                <br />
                <br />
                اگر مقاله‌ای در این دسته‌بندی باشد، حذف انجام نمی‌شود و ابتدا
                باید دسته‌بندی آن مقالات را تغییر دهید.
              </>
            ),
            emptyTitle: "هنوز دسته‌بندی‌ای ساخته نشده است",
            emptyDescription:
              "برای دسته‌بندی مقالات، نخستین دسته را اضافه کنید.",
          }}
          renderForm={(category, helpers) => (
            <CategoryFields
              category={category}
              csrfToken={helpers.csrfToken}
              error={helpers.error}
            />
          )}
          renderRow={(category) => (
            <div className="flex min-w-0 items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[0.9375rem] font-semibold text-navy-900">
                    {category.title}
                  </span>
                  {!category.published && (
                    <span className="shrink-0 rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.625rem] text-muted">
                      پنهان
                    </span>
                  )}
                </span>
                <span
                  dir="ltr"
                  className="mt-0.5 block truncate text-start text-[0.75rem] text-muted-2"
                >
                  /{category.slug}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-1.5 text-[0.75rem] text-muted">
                <Icon name="article" size={14} />
                {fa(counts[category.slug] ?? 0)}
              </span>
            </div>
          )}
        />
      </Panel>

      {categories.length > 1 && (
        <Panel
          title="ترتیب نمایش"
          description="ترتیب دسته‌بندی‌ها در نوار فیلتر صفحه مقالات."
        >
          <ReorderPanel
            items={categories}
            action={reorderCategoriesAction}
            csrfToken={csrfToken}
            itemLabel={(category) => category.title}
            renderItem={(category) => (
              <span className="truncate text-[0.875rem] font-medium text-navy-900">
                {category.title}
              </span>
            )}
          />
        </Panel>
      )}
    </div>
  );
}
