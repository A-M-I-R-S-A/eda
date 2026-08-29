"use client";

import { useActionState, useState } from "react";
import type { FooterColumn, FooterSettings, NavLink, Page } from "@/types";
import { cn } from "@/lib/utils/cn";
import { newId } from "@/lib/utils/id";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveFooterAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection, ToggleField } from "./form-shell";
import { MediaField } from "./media-picker";
import { NavEditor } from "./nav-editor";
import { DragHandle, SortableList } from "./sortable";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * Footer settings.
 *
 * Columns are a nested list — a column, each with its own links — which flat
 * `FormData` cannot express. Each column posts its links as a JSON string on
 * the column row; the action rebuilds them field by field rather than trusting
 * the blob wholesale.
 */

interface ColumnRow extends FooterColumn {
  __key: string;
}

function ColumnEditor({
  columns: initial,
  pages,
}: {
  columns: FooterColumn[];
  pages: Pick<Page, "id" | "title" | "slug">[];
}) {
  const [columns, setColumns] = useState<ColumnRow[]>(() =>
    [...initial]
      .sort((a, b) => a.order - b.order)
      .map((column) => ({ ...column, __key: column.id || newId() })),
  );
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const update = (key: string, patch: Partial<ColumnRow>) =>
    setColumns((prev) =>
      prev.map((column) => (column.__key === key ? { ...column, ...patch } : column)),
    );

  const updateLinks = (key: string, links: NavLink[]) =>
    update(key, { links });

  const addColumn = () => {
    const key = newId();
    setColumns((prev) => [
      ...prev,
      {
        id: key,
        __key: key,
        title: "",
        order: prev.length,
        visible: true,
        links: [],
      },
    ]);
    setOpenColumn(key);
  };

  const inputClass =
    "h-10 w-full rounded-sm border border-line-2 bg-white px-3 text-[0.875rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]";

  return (
    <div className="flex flex-col gap-3">
      {columns.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-2 px-4 py-6 text-center text-[0.8125rem] text-muted">
          هیچ ستونی تعریف نشده است.
        </p>
      ) : (
        <SortableList
          items={columns}
          getKey={(column) => column.__key}
          onReorder={setColumns}
        >
          {(column, props) => {
            const isOpen = openColumn === column.__key;

            return (
              <div
                className={cn(
                  "rounded-sm border bg-white",
                  isOpen ? "border-navy-400" : "border-line-2",
                  !column.visible && "opacity-60",
                )}
              >
                <input type="hidden" name="columnId" value={column.id} />
                <input
                  type="hidden"
                  name="columnVisible"
                  value={column.visible ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name="columnLinks"
                  value={JSON.stringify(
                    column.links.map((link, index) => ({ ...link, order: index })),
                  )}
                />

                <div className="flex items-center gap-2 p-2.5">
                  <DragHandle {...props} label={column.title || "ستون"} />

                  <label className="sr-only" htmlFor={`col-${column.__key}`}>
                    عنوان ستون
                  </label>
                  <input
                    id={`col-${column.__key}`}
                    name="columnTitle"
                    value={column.title}
                    onChange={(event) =>
                      update(column.__key, { title: event.target.value })
                    }
                    placeholder="عنوان ستون"
                    className={cn(inputClass, "flex-1")}
                  />

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenColumn(isOpen ? null : column.__key)
                      }
                      aria-expanded={isOpen}
                      aria-label="ویرایش پیوندهای ستون"
                      title="ویرایش پیوندهای ستون"
                      className="flex h-8 items-center gap-1.5 rounded-xs px-2 text-[0.75rem] text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                    >
                      <Icon name={isOpen ? "chevron-up" : "list"} size={15} />
                      {column.links.length} پیوند
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        update(column.__key, { visible: !column.visible })
                      }
                      aria-label={column.visible ? "پنهان کردن" : "نمایش"}
                      title={column.visible ? "پنهان کردن" : "نمایش"}
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                    >
                      <Icon name={column.visible ? "eye" : "eye-off"} size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setColumns((prev) =>
                          prev.filter((item) => item.__key !== column.__key),
                        )
                      }
                      aria-label="حذف ستون"
                      title="حذف ستون"
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-line p-4">
                    <ColumnLinks
                      links={column.links}
                      pages={pages}
                      onChange={(links) => updateLinks(column.__key, links)}
                    />
                  </div>
                )}
              </div>
            );
          }}
        </SortableList>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        icon="plus"
        onClick={addColumn}
        disabled={columns.length >= 4}
        className="self-start"
      >
        افزودن ستون
      </Button>
    </div>
  );
}

/**
 * Links inside one footer column.
 *
 * A plain controlled list rather than `NavEditor` — these are not posted as
 * form fields at all; they are serialised onto the column row, so they need a
 * change callback instead of input names.
 */
function ColumnLinks({
  links,
  pages,
  onChange,
}: {
  links: NavLink[];
  pages: Pick<Page, "id" | "title" | "slug">[];
  onChange: (links: NavLink[]) => void;
}) {
  const inputClass =
    "h-10 w-full rounded-sm border border-line-2 bg-white px-3 text-[0.875rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]";

  const update = (index: number, patch: Partial<NavLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  return (
    <div className="flex flex-col gap-2">
      <SortableList
        items={links}
        getKey={(link, index) => link.id || `link-${index}`}
        onReorder={onChange}
      >
        {(link, props) => (
          <div className="flex items-center gap-2 rounded-sm border border-line-2 bg-paper-2/40 p-2">
            <DragHandle {...props} label={link.label || "پیوند"} />

            <input
              value={link.label}
              onChange={(event) =>
                update(props.index, { label: event.target.value })
              }
              placeholder="عنوان"
              aria-label="عنوان پیوند"
              className={cn(inputClass, "flex-1")}
            />
            <input
              value={link.href}
              onChange={(event) =>
                update(props.index, { href: event.target.value })
              }
              placeholder="/about"
              aria-label="نشانی پیوند"
              dir="ltr"
              className={cn(inputClass, "flex-1 text-start")}
            />

            {pages.length > 0 && (
              <select
                value=""
                aria-label="انتخاب از صفحات"
                onChange={(event) => {
                  const page = pages.find((item) => item.id === event.target.value);
                  if (!page) return;
                  update(props.index, {
                    href: page.slug ? `/${page.slug}` : "/",
                    label: link.label || page.title,
                  });
                }}
                className="h-10 w-10 shrink-0 cursor-pointer appearance-none rounded-sm border border-line-2 bg-white text-center text-[0.75rem] text-muted focus:outline-none"
              >
                <option value="">↧</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() =>
                onChange(links.filter((_, index) => index !== props.index))
              }
              aria-label="حذف پیوند"
              className="flex size-8 shrink-0 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        )}
      </SortableList>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon="plus"
        onClick={() =>
          onChange([
            ...links,
            {
              id: newId(),
              label: "",
              href: "/",
              order: links.length,
              visible: true,
            },
          ])
        }
        disabled={links.length >= 12}
        className="self-start"
      >
        افزودن پیوند
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function FooterForm({
  footer,
  pages,
  csrfToken,
}: {
  footer: FooterSettings;
  pages: Pick<Page, "id" | "title" | "slug">[];
  csrfToken: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveFooterAction,
    idleState as FormState,
  );

  const [logo, setLogo] = useState(footer.logoUrl ?? "");
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات فوتر دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
  );

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

      <FormSection title="نشان و معرفی">
        <MediaField
          name="logoUrl"
          label="لوگوی فوتر"
          value={logo}
          onChange={(value) => {
            setLogo(value);
            setDirty(true);
          }}
          csrfToken={csrfToken}
          hint="خالی بگذارید تا نشان اختصاصی مؤسسه نمایش داده شود."
        />

        <ToggleField
          name="showWordmark"
          label="نمایش نام مؤسسه"
          defaultChecked={footer.showWordmark}
        />

        <Field
          htmlFor="footer-description"
          label="متن معرفی"
          hint="خالی بگذارید تا توضیح مؤسسه از تنظیمات سایت استفاده شود."
        >
          <Textarea
            id="footer-description"
            name="description"
            rows={4}
            defaultValue={footer.description}
          />
        </Field>
      </FormSection>

      <FormSection
        title="ستون‌های پیوند"
        description="هر ستون یک عنوان و فهرستی از پیوندها دارد. حداکثر ۴ ستون."
      >
        <ColumnEditor columns={footer.columns} pages={pages} />
      </FormSection>

      <FormSection
        title="نوار اقدام"
        description="سه کارت بزرگ بالای بخش حقوقی فوتر."
      >
        <NavEditor
          prefix="action"
          label="کارت‌های اقدام"
          links={footer.quickActions}
          pages={pages}
          withDescription
          max={4}
        />
      </FormSection>

      <FormSection title="بخش حقوقی">
        <NavEditor
          prefix="legal"
          label="پیوندهای حقوقی"
          description="در نوار پایینی فوتر نمایش داده می‌شوند."
          links={footer.legalLinks}
          pages={pages}
          max={6}
        />

        <Field
          htmlFor="copyright"
          label="متن کپی‌رایت"
          hint="عبارت {year} با سال جاری شمسی و {name} با نام مؤسسه جایگزین می‌شود."
        >
          <Input
            id="copyright"
            name="copyright"
            defaultValue={footer.copyright}
          />
        </Field>

        <ToggleField
          name="showAdminLink"
          label="نمایش پیوند «ورود مدیریت»"
          defaultChecked={footer.showAdminLink}
        />
      </FormSection>

      <FormSection title="بخش‌های نمایشی">
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            name="showContactBlock"
            label="نمایش اطلاعات تماس"
            description="نشانی، شماره‌ها، ایمیل و ساعات کاری از تنظیمات سایت."
            defaultChecked={footer.showContactBlock}
          />
          <ToggleField
            name="showSocials"
            label="نمایش شبکه‌های اجتماعی"
            defaultChecked={footer.showSocials}
          />
        </div>
      </FormSection>

      <FormSection
        title="خبرنامه"
        description="فرم عضویت در خبرنامه، در فوتر تمام صفحات. نشانی‌های ثبت‌شده در بخش «فرم‌ها» دیده می‌شوند."
      >
        <ToggleField
          name="showNewsletter"
          label="نمایش فرم خبرنامه"
          defaultChecked={footer.showNewsletter ?? false}
        />

        <Field htmlFor="newsletterTitle" label="عنوان">
          <Input
            id="newsletterTitle"
            name="newsletterTitle"
            defaultValue={footer.newsletterTitle ?? ""}
          />
        </Field>

        <Field htmlFor="newsletterDescription" label="توضیح کوتاه">
          <Textarea
            id="newsletterDescription"
            name="newsletterDescription"
            rows={2}
            defaultValue={footer.newsletterDescription ?? ""}
          />
        </Field>
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
