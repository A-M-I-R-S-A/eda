"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { Page, PageSection, SectionType, SectionValue } from "@/types";
import { cn } from "@/lib/utils/cn";
import { newId } from "@/lib/utils/id";
import { fa } from "@/lib/utils/persian";
import {
  SECTION_BACKGROUND_OPTIONS,
  SECTION_GROUPS,
  SECTION_LIBRARY,
  SECTION_SPACING_OPTIONS,
  buildSectionDefaults,
  getSectionDefinition,
} from "@/lib/cms/section-library";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { useActionResult } from "./use-action-result";
import { idleState, type FormState } from "@/lib/actions/types";
import { savePageSectionsAction } from "@/lib/actions/pages";
import { ROUTES } from "@/lib/config/routes";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { ConfirmDialog, DirtyBadge, Modal, useUnsavedChanges } from "./dialog";
import { DragHandle, SortableList } from "./sortable";
import { SectionField } from "./section-fields";

/**
 * The page builder.
 *
 * The whole section list is held in client state and posted as one JSON
 * payload. That is deliberate: reordering, adding, duplicating, hiding and
 * editing then become a single atomic save, so the list an administrator sees
 * and the list that is stored can never disagree — which they would if each
 * gesture fired its own request and one of them failed.
 *
 * Nothing is written until "ذخیره تغییرات" is pressed, and leaving with
 * unsaved work is guarded.
 */

interface EditableSection extends PageSection {
  /** Stable key across reorders, independent of the persisted id. */
  __key: string;
}

const toEditable = (sections: PageSection[]): EditableSection[] =>
  [...sections]
    .sort((a, b) => a.order - b.order)
    .map((section) => ({ ...section, __key: section.id }));

/** What actually gets posted — the editor-only key is stripped. */
const toPayload = (sections: EditableSection[]) =>
  sections.map(({ __key: _key, ...section }, index) => ({
    ...section,
    order: index,
  }));

export function SectionEditor({
  page,
  csrfToken,
}: {
  page: Page;
  csrfToken: string;
}) {
  const [sections, setSections] = useState<EditableSection[]>(() =>
    toEditable(page.sections),
  );
  const [openId, setOpenId] = useState<string | null>(
    page.sections[0]?.id ?? null,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<EditableSection | null>(null);

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    savePageSectionsAction,
    idleState as FormState,
  );

  /**
   * Dirty tracking compares against the last *saved* snapshot rather than the
   * original prop, so a successful save clears the warning without a reload.
   */
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(toPayload(toEditable(page.sections))),
  );
  const current = useMemo(
    () => JSON.stringify(toPayload(sections)),
    [sections],
  );
  const dirty = current !== savedSnapshot;

  // A successful save makes the current section list the new baseline, which
  // is what clears the unsaved-changes guard.
  useActionResult(state, (result) => {
    if (result.status === "success") setSavedSnapshot(current);
  });

  useUnsavedChanges(
    dirty,
    "تغییرات ذخیره‌نشده‌ای در بخش‌های این صفحه دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
  );

  /* -- mutations --------------------------------------------------------- */

  const update = (key: string, patch: Partial<EditableSection>) =>
    setSections((prev) =>
      prev.map((section) =>
        section.__key === key ? { ...section, ...patch } : section,
      ),
    );

  const updateData = (key: string, field: string, value: SectionValue) =>
    setSections((prev) =>
      prev.map((section) =>
        section.__key === key
          ? { ...section, data: { ...section.data, [field]: value } }
          : section,
      ),
    );

  const addSection = (type: SectionType) => {
    const definition = getSectionDefinition(type);
    const id = newId();
    const section: EditableSection = {
      id,
      __key: id,
      type,
      name: definition.label,
      visible: true,
      order: sections.length,
      background: definition.defaultBackground ?? "paper",
      spacing: definition.defaultSpacing ?? "md",
      data: buildSectionDefaults(type),
    };
    setSections((prev) => [...prev, section]);
    setOpenId(id);
    setAddOpen(false);
  };

  const duplicate = (section: EditableSection) => {
    const id = newId();
    const copy: EditableSection = {
      ...section,
      id,
      __key: id,
      name: `${section.name} (رونوشت)`,
      data: structuredClone(section.data),
    };
    setSections((prev) => {
      const index = prev.findIndex((s) => s.__key === section.__key);
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setOpenId(id);
  };

  const remove = (section: EditableSection) => {
    setSections((prev) => prev.filter((s) => s.__key !== section.__key));
    setDeleting(null);
    if (openId === section.id) setOpenId(null);
  };

  const visibleCount = sections.filter((section) => section.visible).length;

  return (
    <>
      <form action={formAction} className="flex flex-col gap-5 pb-28">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        <input type="hidden" name="id" value={page.id} />
        <input type="hidden" name="sections" value={JSON.stringify(toPayload(sections))} />

        {state.status !== "idle" && (
          <Alert
            tone={state.status === "success" ? "success" : "danger"}
            title={state.status === "success" ? "انجام شد" : "ذخیره‌سازی انجام نشد"}
          >
            {state.message}
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[0.875rem] text-muted">
              <span className="font-semibold text-navy-900 tabular-nums">
                {fa(sections.length)}
              </span>{" "}
              بخش، {fa(visibleCount)} مورد نمایش داده می‌شود
            </p>
            <DirtyBadge dirty={dirty} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={page.slug ? `/${page.slug}` : "/"}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-line-2 px-3.5 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
            >
              <Icon name="external" size={15} />
              پیش‌نمایش صفحه
            </Link>
            <Button
              type="button"
              variant="outline"
              size="md"
              icon="plus"
              onClick={() => setAddOpen(true)}
            >
              افزودن بخش
            </Button>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-line-2 bg-white px-6 py-16 text-center">
            <span className="mb-5 flex size-14 items-center justify-center rounded-full border border-line bg-paper-2 text-muted-2">
              <Icon name="layers" size={24} />
            </span>
            <h3 className="text-[1.0625rem] font-bold text-navy-900">
              این صفحه هنوز بخشی ندارد
            </h3>
            <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-[1.95] text-muted">
              با افزودن نخستین بخش، ساخت صفحه را شروع کنید. می‌توانید بعداً
              ترتیب بخش‌ها را تغییر دهید یا آن‌ها را پنهان کنید.
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon="plus"
              onClick={() => setAddOpen(true)}
              className="mt-6"
            >
              افزودن بخش
            </Button>
          </div>
        ) : (
          <SortableList
            items={sections}
            getKey={(section) => section.__key}
            onReorder={setSections}
            className="gap-2.5"
          >
            {(section, props) => {
              const definition = getSectionDefinition(section.type);
              const isOpen = openId === section.id;

              return (
                <div
                  className={cn(
                    "rounded-sm border bg-white transition-colors",
                    isOpen ? "border-navy-400 shadow-sm" : "border-line",
                    !section.visible && "bg-paper-2/40",
                  )}
                >
                  {/* -- row header ------------------------------------- */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <DragHandle {...props} label={section.name} />

                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : section.id)}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xs border",
                          section.visible
                            ? "border-line-2 text-navy-700"
                            : "border-line-2 text-muted-2",
                        )}
                      >
                        <Icon name="layers" size={16} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[0.9375rem] font-semibold text-navy-900">
                            {section.name}
                          </span>
                          {!section.visible && (
                            <span className="shrink-0 rounded-xs bg-warning-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-warning">
                              پنهان
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
                          {definition.label}
                        </span>
                      </span>

                      <Icon
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={16}
                        className="shrink-0 text-muted"
                      />
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          update(section.__key, { visible: !section.visible })
                        }
                        aria-label={section.visible ? "پنهان کردن بخش" : "نمایش بخش"}
                        title={section.visible ? "پنهان کردن بخش" : "نمایش بخش"}
                        className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                      >
                        <Icon name={section.visible ? "eye" : "eye-off"} size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicate(section)}
                        aria-label="تکثیر بخش"
                        title="تکثیر بخش"
                        className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                      >
                        <Icon name="duplicate" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(section)}
                        aria-label="حذف بخش"
                        title="حذف بخش"
                        className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>

                  {/* -- editor ----------------------------------------- */}
                  {isOpen && (
                    <div className="border-t border-line">
                      <div className="grid gap-4 border-b border-line bg-paper-2/40 px-4 py-4 sm:grid-cols-3">
                        <Field
                          htmlFor={`name-${section.id}`}
                          label="نام بخش"
                          hint="فقط در پنل مدیریت دیده می‌شود."
                        >
                          <Input
                            id={`name-${section.id}`}
                            value={section.name}
                            onChange={(event) =>
                              update(section.__key, { name: event.target.value })
                            }
                          />
                        </Field>

                        <Field
                          htmlFor={`bg-${section.id}`}
                          label="پس‌زمینه"
                        >
                          <Select
                            id={`bg-${section.id}`}
                            value={section.background}
                            onChange={(event) =>
                              update(section.__key, {
                                background: event.target
                                  .value as PageSection["background"],
                              })
                            }
                            options={SECTION_BACKGROUND_OPTIONS}
                          />
                        </Field>

                        <Field
                          htmlFor={`space-${section.id}`}
                          label="فاصله عمودی"
                        >
                          <Select
                            id={`space-${section.id}`}
                            value={section.spacing}
                            onChange={(event) =>
                              update(section.__key, {
                                spacing: event.target
                                  .value as PageSection["spacing"],
                              })
                            }
                            options={SECTION_SPACING_OPTIONS}
                          />
                        </Field>
                      </div>

                      <div className="grid gap-5 px-4 py-5 sm:grid-cols-2">
                        {definition.fields.map((field) => (
                          <div
                            key={field.name}
                            className={field.half ? "" : "sm:col-span-2"}
                          >
                            <SectionField
                              field={field}
                              value={section.data[field.name]}
                              onChange={(value) =>
                                updateData(section.__key, field.name, value)
                              }
                              csrfToken={csrfToken}
                              idPrefix={`s-${section.id}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          </SortableList>
        )}

        {/* sticky save bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <p className="hidden items-center gap-2 text-[0.75rem] text-muted sm:flex">
              <Icon name="info" size={14} className="text-gold-600" />
              تغییرات پس از ذخیره بلافاصله در وب‌سایت اعمال می‌شود.
            </p>

            <div className="flex flex-1 items-center justify-end gap-2.5">
              <Link
                href={ROUTES.admin.pages}
                className="inline-flex h-11 items-center rounded-sm px-4 text-[0.9375rem] font-medium text-navy-800 transition-colors hover:bg-navy-900/[0.05]"
              >
                بازگشت
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={pending}
                loadingText="در حال ذخیره…"
                disabled={!dirty}
                className="min-w-[9rem]"
              >
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* -- add section ---------------------------------------------------- */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="افزودن بخش جدید"
        description="یک بخش را از کتابخانه انتخاب کنید. پس از افزودن می‌توانید محتوای آن را ویرایش کنید."
        size="lg"
      >
        <div className="flex flex-col gap-6">
          {SECTION_GROUPS.map((group) => {
            const definitions = Object.values(SECTION_LIBRARY).filter(
              (definition) => definition.group === group.key,
            );
            if (!definitions.length) return null;

            return (
              <div key={group.key}>
                <p className="mb-3 text-[0.8125rem] font-semibold text-muted">
                  {group.label}
                </p>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {definitions.map((definition) => (
                    <li key={definition.type}>
                      <button
                        type="button"
                        onClick={() => addSection(definition.type)}
                        className="flex h-full w-full flex-col rounded-sm border border-line-2 bg-white p-4 text-start transition-colors hover:border-navy-500 hover:bg-paper-2/40"
                      >
                        <span className="text-[0.9375rem] font-semibold text-navy-900">
                          {definition.label}
                        </span>
                        <span className="mt-1.5 text-[0.8125rem] leading-[1.9] text-muted">
                          {definition.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* -- delete confirmation -------------------------------------------- */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="حذف بخش"
        message={
          <>
            بخش «<span className="font-semibold">{deleting?.name}</span>» و تمام
            محتوای آن حذف می‌شود. اگر فقط می‌خواهید موقتاً از سایت برداشته شود،
            به‌جای حذف از دکمه «پنهان کردن» استفاده کنید.
          </>
        }
        confirmLabel="حذف بخش"
      />
    </>
  );
}
