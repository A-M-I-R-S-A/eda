"use client";

import { useState } from "react";
import type { FieldDef, SectionData, SectionValue } from "@/types";
import { cn } from "@/lib/utils/cn";
import { newId } from "@/lib/utils/id";
import { allRows } from "@/lib/cms/section-data";
import { Icon, type IconName } from "@/components/ui/icon";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { MediaField } from "./media-picker";
import { RichTextEditor } from "./rich-text-editor";
import { DragHandle, SortableList } from "./sortable";

/**
 * The generic field renderer.
 *
 * Every section type is edited by this one component, driven by the field
 * schema in `@/lib/cms/section-library`. That is what makes the section
 * library real: adding a type is a registry entry plus a renderer, never a new
 * admin form.
 */

/* -------------------------------------------------------------------------- */
/*  Icon picker                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The icons that make sense inside content.
 *
 * A subset of the registry on purpose — offering the admin chrome icons
 * (spinner, close, menu) in a content picker only invites choices that look
 * broken on the public site.
 */
const CONTENT_ICONS: IconName[] = [
  "scale-minimal", "gavel", "gavel-free-balance", "handshake", "briefcase",
  "document", "shield", "lock", "columns", "compass", "layers", "bridge",
  "globe", "clock", "calendar", "check-circle", "info", "users", "user",
  "phone", "mail", "map-pin", "quote", "star", "search", "article",
  "question", "tag", "image", "folder",
];

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex h-12 flex-1 items-center gap-3 rounded-sm border border-line-2 bg-white px-3.5 text-start text-[0.875rem] transition-colors hover:border-navy-500"
        >
          <span className="flex size-8 items-center justify-center rounded-xs border border-line-2 text-navy-700">
            {value ? (
              <Icon name={value as IconName} size={17} />
            ) : (
              <Icon name="plus" size={15} className="text-muted-2" />
            )}
          </span>
          <span className={value ? "text-ink-2" : "text-muted-2"}>
            {value || "انتخاب آیکون"}
          </span>
          <Icon
            name="chevron-down"
            size={15}
            className="ms-auto text-muted"
          />
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="حذف آیکون"
            className="flex size-12 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-danger/50 hover:text-danger"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-sm border border-line-2 bg-white p-2 sm:grid-cols-10">
          {CONTENT_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              title={icon}
              onClick={() => {
                onChange(icon);
                setOpen(false);
              }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xs border transition-colors",
                value === icon
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-transparent text-navy-700 hover:border-line-2 hover:bg-paper-2",
              )}
            >
              <Icon name={icon} size={17} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Single field                                                              */
/* -------------------------------------------------------------------------- */

export function SectionField({
  field,
  value,
  onChange,
  csrfToken,
  idPrefix,
}: {
  field: FieldDef;
  value: SectionValue;
  onChange: (value: SectionValue) => void;
  csrfToken: string;
  idPrefix: string;
}) {
  const controlId = `${idPrefix}-${field.name}`;
  const text = typeof value === "string" ? value : value == null ? "" : String(value);

  switch (field.kind) {
    case "toggle":
      return (
        <label className="flex cursor-pointer items-start justify-between gap-5 rounded-sm border border-line-2 bg-white p-3.5">
          <span className="min-w-0">
            <span className="block text-[0.875rem] font-semibold text-navy-900">
              {field.label}
            </span>
            {field.hint && (
              <span className="mt-1 block text-[0.8125rem] leading-[1.9] text-muted">
                {field.hint}
              </span>
            )}
          </span>
          <span className="relative mt-0.5 inline-flex shrink-0">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(event) => onChange(event.target.checked)}
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
      );

    case "image":
    case "video":
      return (
        <MediaField
          name={`${controlId}-media`}
          label={field.label}
          value={text}
          onChange={onChange}
          csrfToken={csrfToken}
          hint={field.hint}
          kind={field.kind === "video" ? "video" : "image"}
        />
      );

    case "richtext":
      return (
        <Field htmlFor={controlId} label={field.label} hint={field.hint}>
          <RichTextEditor
            id={controlId}
            name={`${controlId}-body`}
            value={text}
            onChange={onChange}
            csrfToken={csrfToken}
            rows={12}
          />
        </Field>
      );

    case "icon":
      return (
        <Field label={field.label} hint={field.hint}>
          <IconPicker value={text} onChange={onChange} />
        </Field>
      );

    case "select":
      return (
        <Field htmlFor={controlId} label={field.label} hint={field.hint}>
          <Select
            id={controlId}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            options={field.options ?? []}
          />
        </Field>
      );

    case "number":
      return (
        <Field htmlFor={controlId} label={field.label} hint={field.hint}>
          <Input
            id={controlId}
            type="number"
            value={text}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(event) => onChange(Number(event.target.value))}
            ltr
          />
        </Field>
      );

    case "textarea":
      return (
        <Field htmlFor={controlId} label={field.label} hint={field.hint}>
          <Textarea
            id={controlId}
            rows={field.rows ?? 4}
            value={text}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      );

    case "color":
      return (
        <Field htmlFor={controlId} label={field.label} hint={field.hint}>
          <div className="flex gap-2">
            <input
              id={controlId}
              type="color"
              value={text || "#000000"}
              onChange={(event) => onChange(event.target.value)}
              className="h-12 w-16 shrink-0 cursor-pointer rounded-sm border border-line-2 bg-white p-1"
            />
            <Input
              value={text}
              onChange={(event) => onChange(event.target.value)}
              ltr
              placeholder="#000000"
            />
          </div>
        </Field>
      );

    case "repeater":
      return (
        <RepeaterField
          field={field}
          value={value}
          onChange={onChange}
          csrfToken={csrfToken}
          idPrefix={controlId}
        />
      );

    default:
      return (
        <Field htmlFor={controlId} label={field.label} hint={field.hint}>
          <Input
            id={controlId}
            value={text}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
            ltr={field.kind === "url"}
          />
        </Field>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Repeater                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A repeater row plus an editor-only stable key.
 *
 * Rows have no persisted id, so React would otherwise key them by index and
 * lose input focus every time the list is reordered. The key is stripped
 * before the section is saved.
 */
type RepeaterRow = SectionData & { __key?: string };

/**
 * A repeating group of fields — cards, statistics, gallery images, steps.
 *
 * Rows are reorderable, individually collapsible and individually
 * enable/disable-able. The disable toggle matters: hiding one card is a far
 * more common editorial action than deleting it, and deleting to hide loses
 * the copy.
 */
function RepeaterField({
  field,
  value,
  onChange,
  csrfToken,
  idPrefix,
}: {
  field: FieldDef;
  value: SectionValue;
  onChange: (value: SectionValue) => void;
  csrfToken: string;
  idPrefix: string;
}) {
  const rows = allRows({ v: value } as SectionData, "v") as RepeaterRow[];
  const [openRow, setOpenRow] = useState<number | null>(rows.length ? 0 : null);
  const max = field.max ?? 20;
  const rowFields = field.fields ?? [];

  /** Rows have no stable id of their own, so one is attached on first render. */
  const keyed: RepeaterRow[] = rows.map((row) => ({
    ...row,
    __key: typeof row.__key === "string" ? row.__key : newId(),
  }));

  const commit = (next: RepeaterRow[]) => onChange(next as SectionData[]);

  const addRow = () => {
    const blank: RepeaterRow = { __key: newId(), enabled: true };
    for (const rowField of rowFields) {
      if (rowField.name === "enabled") continue;
      blank[rowField.name] = rowField.kind === "toggle" ? false : "";
    }
    commit([...keyed, blank]);
    setOpenRow(keyed.length);
  };

  const updateRow = (index: number, key: string, next: SectionValue) => {
    commit(
      keyed.map((row, i) => (i === index ? { ...row, [key]: next } : row)),
    );
  };

  const removeRow = (index: number) => {
    commit(keyed.filter((_, i) => i !== index));
    setOpenRow(null);
  };

  const duplicateRow = (index: number) => {
    const copy = { ...keyed[index], __key: newId() };
    const next = [...keyed];
    next.splice(index + 1, 0, copy);
    commit(next);
    setOpenRow(index + 1);
  };

  const rowTitle = (row: RepeaterRow, index: number) => {
    const key = field.titleField ?? rowFields[0]?.name;
    const label = key ? row[key] : undefined;
    return typeof label === "string" && label.trim()
      ? label.trim()
      : `مورد ${index + 1}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.875rem] font-semibold text-navy-800">
          {field.label}
        </span>
        <span className="text-[0.75rem] text-muted-2 tabular-nums">
          {keyed.length} / {max}
        </span>
      </div>

      {field.hint && (
        <p className="-mt-1 text-[0.8125rem] text-muted">{field.hint}</p>
      )}

      {keyed.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-2 px-4 py-6 text-center text-[0.8125rem] text-muted">
          هنوز موردی اضافه نشده است.
        </p>
      ) : (
        <SortableList
          items={keyed}
          getKey={(row) => row.__key as string}
          onReorder={commit}
        >
          {(row, props) => {
            const index = props.index;
            const isOpen = openRow === index;
            const enabled = row.enabled !== false;

            return (
              <div
                className={cn(
                  "rounded-sm border bg-white",
                  isOpen ? "border-navy-400" : "border-line-2",
                  !enabled && "opacity-60",
                )}
              >
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <DragHandle {...props} label={rowTitle(row, index)} />

                  <button
                    type="button"
                    onClick={() => setOpenRow(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  >
                    <span className="truncate text-[0.875rem] font-medium text-navy-900">
                      {rowTitle(row, index)}
                    </span>
                    {!enabled && (
                      <span className="shrink-0 rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.625rem] text-muted">
                        غیرفعال
                      </span>
                    )}
                    <Icon
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={15}
                      className="ms-auto shrink-0 text-muted"
                    />
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => updateRow(index, "enabled", !enabled)}
                      aria-label={enabled ? "غیرفعال کردن" : "فعال کردن"}
                      title={enabled ? "غیرفعال کردن" : "فعال کردن"}
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                    >
                      <Icon name={enabled ? "eye" : "eye-off"} size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateRow(index)}
                      aria-label="تکثیر"
                      title="تکثیر"
                      disabled={keyed.length >= max}
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800 disabled:opacity-30"
                    >
                      <Icon name="duplicate" size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      aria-label="حذف"
                      title="حذف"
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
                    {rowFields
                      .filter((rowField) => rowField.name !== "enabled")
                      .map((rowField) => (
                        <div
                          key={rowField.name}
                          className={rowField.half ? "" : "sm:col-span-2"}
                        >
                          <SectionField
                            field={rowField}
                            value={row[rowField.name]}
                            onChange={(next) =>
                              updateRow(index, rowField.name, next)
                            }
                            csrfToken={csrfToken}
                            idPrefix={`${idPrefix}-${index}`}
                          />
                        </div>
                      ))}
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
        disabled={keyed.length >= max}
        className="self-start"
      >
        افزودن مورد
      </Button>
    </div>
  );
}
