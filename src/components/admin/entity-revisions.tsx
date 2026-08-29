"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Revision } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { formatJalaliDateTime, formatRelative } from "@/lib/utils/jalali";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert, EmptyState } from "@/components/ui/states";
import { ConfirmDialog, Modal, Toast } from "./dialog";
import { useActionResult } from "./use-action-result";

/**
 * Version history for pages and articles.
 *
 * Deliberately field-level rather than character-level: what an administrator
 * needs before restoring is "which fields moved", so they can judge whether
 * losing the current values is acceptable. A character diff of a 3,000-word
 * article answers a question nobody asked.
 */

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface RevisionField {
  key: string;
  label: string;
  /** Formats the stored value for display; defaults to `String(value)`. */
  format?: (value: unknown) => string;
}

interface Change {
  label: string;
  before: string;
  after: string;
}

function summarise(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join("، ") : "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";

  const text = String(value);
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

export function EntityRevisions<T extends Record<string, unknown>>({
  current,
  revisions,
  fields,
  action,
  csrfToken,
}: {
  current: T;
  revisions: Revision[];
  fields: RevisionField[];
  action: Action;
  csrfToken: string;
}) {
  const router = useRouter();
  const [comparing, setComparing] = useState<Revision | null>(null);
  const [confirming, setConfirming] = useState<Revision | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [state, restore, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );

  useActionResult(state, (result) => {
    setToast(result.message ?? null);
    if (result.status === "success") {
      setConfirming(null);
      setComparing(null);
    }
  });

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state.status, state.submissionId, router]);

  const diff = (revision: Revision): Change[] => {
    const snapshot = (revision.snapshot ?? {}) as Record<string, unknown>;
    const changes: Change[] = [];

    for (const field of fields) {
      const format = field.format ?? summarise;
      const before = format(snapshot[field.key]);
      const after = format(current[field.key]);
      if (before !== after) {
        changes.push({ label: field.label, before, after });
      }
    }

    return changes;
  };

  if (revisions.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="هنوز نسخه‌ای ثبت نشده است"
        description="از نخستین ویرایش پس از این، نسخه پیشین به‌صورت خودکار نگهداری می‌شود."
      />
    );
  }

  return (
    <>
      {state.status === "error" && (
        <Alert tone="danger" className="mb-4">
          {state.message}
        </Alert>
      )}

      <ol className="flex flex-col">
        {revisions.map((revision, index) => {
          const changes = diff(revision);

          return (
            <li
              key={revision.id}
              className="flex gap-4 border-b border-line py-4 last:border-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-bold tabular-nums",
                  index === 0
                    ? "border-gold-300 bg-gold-50 text-gold-700"
                    : "border-line-2 text-muted",
                )}
              >
                {fa(revisions.length - index)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-[0.875rem] font-semibold text-navy-900">
                    {formatRelative(revision.at)}
                    {index === 0 && (
                      <span className="ms-2 rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.625rem] font-medium text-muted">
                        آخرین نسخه پیش از وضعیت فعلی
                      </span>
                    )}
                  </p>
                  <p className="text-[0.75rem] text-muted-2 tabular-nums">
                    {formatJalaliDateTime(revision.at)}
                  </p>
                </div>

                <p className="mt-1 text-[0.8125rem] text-muted">
                  توسط {revision.authorName}
                  {revision.note ? ` — ${revision.note}` : ""}
                </p>

                <p className="mt-2 text-[0.8125rem] text-muted">
                  {changes.length === 0
                    ? "تفاوتی با وضعیت فعلی ندارد."
                    : `${fa(changes.length)} فیلد نسبت به وضعیت فعلی تفاوت دارد.`}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon="eye"
                    onClick={() => setComparing(revision)}
                    disabled={changes.length === 0}
                  >
                    مقایسه با وضعیت فعلی
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon="refresh"
                    onClick={() => setConfirming(revision)}
                    disabled={changes.length === 0}
                  >
                    بازگردانی این نسخه
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Modal
        open={Boolean(comparing)}
        onClose={() => setComparing(null)}
        title="مقایسه نسخه‌ها"
        size="lg"
      >
        {comparing && (
          <div className="flex flex-col gap-4">
            <p className="text-[0.875rem] text-muted">
              نسخه {formatJalaliDateTime(comparing.at)} در مقایسه با وضعیت فعلی.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse">
                <caption className="sr-only">تفاوت فیلدها</caption>
                <thead>
                  <tr className="border-b border-line bg-paper-2/60 text-[0.75rem] text-muted">
                    <th scope="col" className="px-3 py-2.5 text-start">فیلد</th>
                    <th scope="col" className="px-3 py-2.5 text-start">نسخه قبلی</th>
                    <th scope="col" className="px-3 py-2.5 text-start">وضعیت فعلی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {diff(comparing).map((change) => (
                    <tr key={change.label} className="align-top">
                      <th
                        scope="row"
                        className="px-3 py-3 text-start text-[0.8125rem] font-semibold text-navy-800"
                      >
                        {change.label}
                      </th>
                      <td className="px-3 py-3 text-[0.8125rem] leading-[1.9] text-muted">
                        {change.before}
                      </td>
                      <td className="px-3 py-3 text-[0.8125rem] leading-[1.9] text-navy-900">
                        {change.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              icon="refresh"
              onClick={() => {
                setConfirming(comparing);
                setComparing(null);
              }}
              className="self-start"
            >
              بازگردانی این نسخه
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return;
          const data = new FormData();
          data.set(CSRF_FIELD, csrfToken);
          data.set("revisionId", confirming.id);
          restore(data);
        }}
        pending={pending}
        tone="primary"
        title="بازگردانی نسخه قبلی"
        confirmLabel="بله، بازگردان"
        message={
          <>
            محتوای فعلی با نسخه{" "}
            <span className="font-semibold">
              {confirming ? formatJalaliDateTime(confirming.at) : ""}
            </span>{" "}
            جایگزین می‌شود.
            <br />
            <br />
            وضعیت فعلی پیش از بازگردانی به‌صورت خودکار ذخیره می‌شود، بنابراین
            می‌توانید این کار را برگردانید.
          </>
        }
      />

      <Toast
        message={toast}
        tone={state.status === "error" ? "danger" : "success"}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field maps                                                                */
/* -------------------------------------------------------------------------- */

const listFormat = (value: unknown) =>
  Array.isArray(value) && value.length ? value.join("، ") : "—";

export const ARTICLE_REVISION_FIELDS: RevisionField[] = [
  { key: "title", label: "عنوان" },
  { key: "excerpt", label: "خلاصه" },
  { key: "body", label: "متن مقاله" },
  { key: "category", label: "دسته‌بندی" },
  { key: "authorName", label: "نویسنده" },
  { key: "coverImage", label: "تصویر شاخص" },
  { key: "tags", label: "برچسب‌ها", format: listFormat },
  { key: "featured", label: "مقاله ویژه" },
  { key: "status", label: "وضعیت انتشار" },
];
