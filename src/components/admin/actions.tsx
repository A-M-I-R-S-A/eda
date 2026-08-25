"use client";

import { useActionState, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { idleState, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Icon, Spinner, type IconName } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/* -------------------------------------------------------------------------- */
/*  Status changer                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Status dropdown + optional internal note.
 *
 * Used by both the request and the appointment detail pages; the caller
 * supplies the option list so the two status vocabularies stay separate.
 */
export function StatusChanger({
  action,
  id,
  csrfToken,
  currentStatus,
  options,
  noteLabel = "یادداشت وضعیت (اختیاری)",
  notePlaceholder = "توضیحی که در سوابق پرونده ثبت می‌شود…",
}: {
  action: Action;
  id: string;
  csrfToken: string;
  currentStatus: string;
  options: { value: string; label: string }[];
  noteLabel?: string;
  notePlaceholder?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="id" value={id} />

      {state.status !== "idle" && (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      )}

      <Field htmlFor={`status-${id}`} label="تغییر وضعیت">
        <Select
          id={`status-${id}`}
          name="status"
          defaultValue={currentStatus}
          options={options}
        />
      </Field>

      <Field htmlFor={`note-${id}`} label={noteLabel}>
        <Textarea
          id={`note-${id}`}
          name="note"
          rows={3}
          maxLength={600}
          placeholder={notePlaceholder}
        />
      </Field>

      <Button
        type="submit"
        variant="primary"
        size="md"
        block
        loading={pending}
        loadingText="در حال ذخیره…"
      >
        ثبت تغییر وضعیت
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Internal note composer                                                    */
/* -------------------------------------------------------------------------- */

export function NoteComposer({
  action,
  id,
  csrfToken,
}: {
  action: Action;
  id: string;
  csrfToken: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );
  const [value, setValue] = useState("");

  // Clear the box when a *new* submission succeeded. Derived during render so
  // no effect is needed for what is really "reset on result change".
  const [lastSubmission, setLastSubmission] = useState(state.submissionId);
  if (state.submissionId !== lastSubmission) {
    setLastSubmission(state.submissionId);
    if (state.status === "success") setValue("");
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="id" value={id} />

      {state.status === "error" && <Alert tone="danger">{state.message}</Alert>}

      <Field
        htmlFor={`note-body-${id}`}
        label="افزودن یادداشت داخلی"
        hint="یادداشت‌ها فقط برای اعضای مؤسسه قابل مشاهده است و به متقاضی نمایش داده نمی‌شود."
        error={state.fieldErrors?.body}
      >
        <Textarea
          id={`note-body-${id}`}
          name="body"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="مثلاً: قرارداد بررسی شد؛ صلاحیت مؤسسه محرز است."
          invalid={Boolean(state.fieldErrors?.body)}
        />
      </Field>

      <Button
        type="submit"
        variant="outline"
        size="sm"
        icon="plus"
        loading={pending}
        loadingText="در حال ثبت…"
        className="self-start"
      >
        ثبت یادداشت
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quick single-value action (status toggle in a table row)                   */
/* -------------------------------------------------------------------------- */

export function QuickAction({
  action,
  csrfToken,
  fields,
  icon,
  label,
  tone = "default",
}: {
  action: Action;
  csrfToken: string;
  fields: Record<string, string>;
  icon: IconName;
  label: string;
  tone?: "default" | "success" | "danger";
}) {
  const [, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className={cn(
          "flex size-9 items-center justify-center rounded-sm border transition-colors disabled:opacity-50",
          tone === "danger"
            ? "border-line-2 text-muted hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
            : tone === "success"
              ? "border-line-2 text-muted hover:border-success/50 hover:bg-success-soft hover:text-success"
              : "border-line-2 text-muted hover:border-navy-500 hover:text-navy-800",
        )}
      >
        {pending ? <Spinner size={15} /> : <Icon name={icon} size={16} />}
      </button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Two-step delete                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Destructive action with an inline confirmation step.
 *
 * Deliberately not `window.confirm`: a native dialog cannot be styled, reads
 * in the browser's language rather than Persian, and is easy to dismiss by
 * reflex. Two explicit clicks are safer and stay inside the design system.
 */
export function ConfirmDelete({
  action,
  csrfToken,
  id,
  label = "حذف",
  confirmLabel = "حذف شود؟",
  size = "icon",
}: {
  action: Action;
  csrfToken: string;
  id: string;
  label?: string;
  confirmLabel?: string;
  size?: "icon" | "button";
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <>
        {state.status === "error" && (
          <span className="text-[0.6875rem] text-danger">{state.message}</span>
        )}
        <button
          type="button"
          onClick={() => setArmed(true)}
          aria-label={label}
          title={label}
          className={
            size === "icon"
              ? "flex size-9 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
              : "inline-flex h-10 items-center gap-2 rounded-sm border border-danger/30 px-4 text-[0.8125rem] font-medium text-danger transition-colors hover:bg-danger-soft"
          }
        >
          <Icon name="trash" size={16} />
          {size === "button" && <span>{label}</span>}
        </button>
      </>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="id" value={id} />

      <span className="text-[0.6875rem] font-medium whitespace-nowrap text-danger">
        {confirmLabel}
      </span>

      <button
        type="submit"
        disabled={pending}
        className="flex h-9 items-center rounded-sm bg-danger px-3 text-[0.75rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? <Spinner size={14} /> : "بله"}
      </button>

      <button
        type="button"
        onClick={() => setArmed(false)}
        className="flex h-9 items-center rounded-sm border border-line-2 px-3 text-[0.75rem] font-medium text-muted transition-colors hover:border-navy-500 hover:text-navy-800"
      >
        خیر
      </button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reschedule                                                                */
/* -------------------------------------------------------------------------- */

export function RescheduleForm({
  action,
  csrfToken,
  id,
  date,
  time,
}: {
  action: Action;
  csrfToken: string;
  id: string;
  date: string;
  time: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="id" value={id} />

      {state.status !== "idle" && (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          htmlFor={`date-${id}`}
          label="تاریخ جدید (میلادی)"
          hint="قالب: YYYY-MM-DD"
          error={state.fieldErrors?.date}
        >
          <input
            id={`date-${id}`}
            name="date"
            type="date"
            defaultValue={date}
            dir="ltr"
            className="min-h-12 w-full rounded-sm border border-line-2 bg-white px-4 py-3 text-[0.9375rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]"
          />
        </Field>

        <Field
          htmlFor={`time-${id}`}
          label="ساعت جدید"
          error={state.fieldErrors?.time}
        >
          <input
            id={`time-${id}`}
            name="time"
            type="time"
            defaultValue={time}
            step={1800}
            dir="ltr"
            className="min-h-12 w-full rounded-sm border border-line-2 bg-white px-4 py-3 text-[0.9375rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]"
          />
        </Field>
      </div>

      <Button
        type="submit"
        variant="outline"
        size="md"
        icon="calendar"
        loading={pending}
        loadingText="در حال ذخیره…"
        className="self-start"
      >
        ثبت زمان‌بندی جدید
      </Button>
    </form>
  );
}
