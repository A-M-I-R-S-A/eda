"use client";

import { useState } from "react";
import type { NavLink, Page } from "@/types";
import { cn } from "@/lib/utils/cn";
import { newId } from "@/lib/utils/id";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { DragHandle, SortableList } from "./sortable";

/**
 * Editor for a list of navigation links.
 *
 * Each row posts its values as parallel arrays under a shared prefix
 * (`navLabel[]`, `navHref[]`, …), which the action zips back into records.
 * Checkboxes cannot be read positionally that way — an unchecked box posts
 * nothing and would shift every later row — so visibility and target are
 * posted as explicit `"1"`/`"0"` hidden inputs instead.
 */

export interface NavEditorProps {
  /** Input-name prefix, e.g. `nav` → `navLabel`, `navHref`. */
  prefix: string;
  label: string;
  description?: string;
  links: NavLink[];
  /** Pages offered as link targets, so common destinations need no typing. */
  pages?: Pick<Page, "id" | "title" | "slug">[];
  /** Adds a per-link description field (used by the quick-action cards). */
  withDescription?: boolean;
  max?: number;
}

interface Row extends NavLink {
  __key: string;
}

const toRows = (links: NavLink[]): Row[] =>
  [...links]
    .sort((a, b) => a.order - b.order)
    .map((link) => ({ ...link, __key: link.id || newId() }));

export function NavEditor({
  prefix,
  label,
  description,
  links,
  pages = [],
  withDescription = false,
  max = 20,
}: NavEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => toRows(links));
  const [openRow, setOpenRow] = useState<string | null>(null);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((row) => (row.__key === key ? { ...row, ...patch } : row)),
    );

  const addRow = () => {
    const key = newId();
    setRows((prev) => [
      ...prev,
      {
        id: key,
        __key: key,
        label: "",
        href: "/",
        order: prev.length,
        visible: true,
        external: false,
        description: "",
      },
    ]);
    setOpenRow(key);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((row) => row.__key !== key));

  const inputClass =
    "h-10 w-full rounded-sm border border-line-2 bg-white px-3 text-[0.875rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.875rem] font-semibold text-navy-800">{label}</p>
          {description && (
            <p className="mt-1 text-[0.8125rem] text-muted">{description}</p>
          )}
        </div>
        <span className="shrink-0 text-[0.75rem] text-muted-2 tabular-nums">
          {rows.length} / {max}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-2 px-4 py-6 text-center text-[0.8125rem] text-muted">
          هیچ پیوندی تعریف نشده است.
        </p>
      ) : (
        <SortableList
          items={rows}
          getKey={(row) => row.__key}
          onReorder={setRows}
        >
          {(row, props) => {
            const isOpen = openRow === row.__key;

            return (
              <div
                className={cn(
                  "rounded-sm border bg-white",
                  isOpen ? "border-navy-400" : "border-line-2",
                  !row.visible && "opacity-60",
                )}
              >
                {/* Values posted for this row. */}
                <input type="hidden" name={`${prefix}Id`} value={row.id} />
                <input
                  type="hidden"
                  name={`${prefix}Visible`}
                  value={row.visible ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name={`${prefix}External`}
                  value={row.external ? "1" : "0"}
                />
                {!withDescription && (
                  <input type="hidden" name={`${prefix}Description`} value="" />
                )}

                <div className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <DragHandle {...props} label={row.label || "پیوند"} />
                  </div>

                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <label className="sr-only" htmlFor={`${prefix}-label-${row.__key}`}>
                      عنوان پیوند
                    </label>
                    <input
                      id={`${prefix}-label-${row.__key}`}
                      name={`${prefix}Label`}
                      value={row.label}
                      onChange={(event) =>
                        update(row.__key, { label: event.target.value })
                      }
                      placeholder="عنوان پیوند"
                      className={inputClass}
                    />

                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor={`${prefix}-href-${row.__key}`}>
                        نشانی پیوند
                      </label>
                      <input
                        id={`${prefix}-href-${row.__key}`}
                        name={`${prefix}Href`}
                        value={row.href}
                        onChange={(event) =>
                          update(row.__key, { href: event.target.value })
                        }
                        dir="ltr"
                        placeholder="/about"
                        className={cn(inputClass, "text-start")}
                      />

                      {pages.length > 0 && (
                        <>
                          <label
                            className="sr-only"
                            htmlFor={`${prefix}-page-${row.__key}`}
                          >
                            انتخاب از صفحات
                          </label>
                          <select
                            id={`${prefix}-page-${row.__key}`}
                            value=""
                            onChange={(event) => {
                              const page = pages.find(
                                (item) => item.id === event.target.value,
                              );
                              if (!page) return;
                              update(row.__key, {
                                href: page.slug ? `/${page.slug}` : "/",
                                label: row.label || page.title,
                              });
                            }}
                            title="انتخاب از صفحات سایت"
                            className="h-10 w-11 shrink-0 cursor-pointer appearance-none rounded-sm border border-line-2 bg-white text-center text-[0.75rem] text-muted focus:border-navy-600 focus:outline-none"
                          >
                            <option value="">↧</option>
                            {pages.map((page) => (
                              <option key={page.id} value={page.id}>
                                {page.title}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    {withDescription && (
                      <button
                        type="button"
                        onClick={() => setOpenRow(isOpen ? null : row.__key)}
                        aria-expanded={isOpen}
                        aria-label="توضیح پیوند"
                        title="توضیح پیوند"
                        className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                      >
                        <Icon name={isOpen ? "chevron-up" : "list"} size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        update(row.__key, { external: !row.external })
                      }
                      aria-pressed={row.external}
                      aria-label="باز شدن در تب جدید"
                      title={
                        row.external
                          ? "در تب جدید باز می‌شود"
                          : "در همین تب باز می‌شود"
                      }
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xs transition-colors",
                        row.external
                          ? "bg-navy-900 text-white"
                          : "text-muted hover:bg-navy-900/[0.06] hover:text-navy-800",
                      )}
                    >
                      <Icon name="external" size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => update(row.__key, { visible: !row.visible })}
                      aria-label={row.visible ? "پنهان کردن" : "نمایش"}
                      title={row.visible ? "پنهان کردن" : "نمایش"}
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                    >
                      <Icon name={row.visible ? "eye" : "eye-off"} size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.__key)}
                      aria-label="حذف پیوند"
                      title="حذف پیوند"
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {withDescription && (
                  <div className={isOpen ? "border-t border-line p-3" : "hidden"}>
                    <label
                      className="mb-1.5 block text-[0.75rem] text-muted"
                      htmlFor={`${prefix}-desc-${row.__key}`}
                    >
                      توضیح کوتاه (زیر عنوان پیوند نمایش داده می‌شود)
                    </label>
                    <input
                      id={`${prefix}-desc-${row.__key}`}
                      name={`${prefix}Description`}
                      value={row.description ?? ""}
                      onChange={(event) =>
                        update(row.__key, { description: event.target.value })
                      }
                      className={inputClass}
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
        onClick={addRow}
        disabled={rows.length >= max}
        className="self-start"
      >
        افزودن پیوند
      </Button>
    </div>
  );
}
