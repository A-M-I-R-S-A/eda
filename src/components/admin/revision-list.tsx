"use client";

import { useActionState, useMemo, useState } from "react";
import type { Page, Revision } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { formatJalaliDateTime } from "@/lib/utils/jalali";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { restorePageRevisionAction } from "@/lib/actions/pages";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert, EmptyState } from "@/components/ui/states";
import { ConfirmDialog, Modal } from "./dialog";
import { useActionResult } from "./use-action-result";

/**
 * Version history for a page.
 *
 * A snapshot is written *before* every save, so the newest entry is "the state
 * before the most recent edit" and restoring it undoes exactly one change.
 * Restoring is itself snapshotted, which makes an accidental restore a
 * one-click mistake rather than a lost afternoon.
 */

interface FieldChange {
  label: string;
  before: string;
  after: string;
}

/**
 * Compares a snapshot against the live record.
 *
 * A character-level diff would be more precise and far less useful here: what
 * an administrator needs to know is *which fields moved*, so they can judge
 * whether restoring is safe. Long values are summarised rather than dumped.
 */
function comparePages(snapshot: Page, current: Page): FieldChange[] {
  const changes: FieldChange[] = [];

  const compare = (label: string, before: unknown, after: unknown) => {
    const a = before == null ? "" : String(before);
    const b = after == null ? "" : String(after);
    if (a !== b) changes.push({ label, before: a || "—", after: b || "—" });
  };

  compare("عنوان", snapshot.title, current.title);
  compare("نامک", snapshot.slug, current.slug);
  compare("توضیح کوتاه", snapshot.excerpt, current.excerpt);
  compare("وضعیت انتشار", snapshot.status, current.status);
  compare("تصویر شاخص", snapshot.featuredImage, current.featuredImage);
  compare("عنوان سئو", snapshot.seo?.metaTitle, current.seo?.metaTitle);
  compare(
    "توضیحات متا",
    snapshot.seo?.metaDescription,
    current.seo?.metaDescription,
  );

  const before = snapshot.sections ?? [];
  const after = current.sections ?? [];

  if (before.length !== after.length) {
    changes.push({
      label: "تعداد بخش‌ها",
      before: fa(before.length),
      after: fa(after.length),
    });
  } else if (JSON.stringify(before) !== JSON.stringify(after)) {
    const renamed = after.filter((section, index) => {
      const previous = before[index];
      return !previous || JSON.stringify(previous) !== JSON.stringify(section);
    });
    changes.push({
      label: "محتوای بخش‌ها",
      before: "نسخه پیشین",
      after: `${fa(renamed.length)} بخش تغییر کرده است`,
    });
  }

  return changes;
}

export function RevisionList({
  page,
  revisions,
  csrfToken,
}: {
  page: Page;
  revisions: Revision[];
  csrfToken: string;
}) {
  const [comparing, setComparing] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState<Revision | null>(null);

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    restorePageRevisionAction,
    idleState as FormState,
  );

  useActionResult(state, () => setRestoring(null));

  const changes = useMemo(
    () =>
      comparing ? comparePages(comparing.snapshot as Page, page) : [],
    [comparing, page],
  );

  if (revisions.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="هنوز نسخه‌ای ثبت نشده است"
        description="پس از نخستین ویرایش این صفحه، نسخه پیشین آن به‌صورت خودکار در اینجا نگهداری می‌شود."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {state.status !== "idle" && (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      )}

      <ol className="flex flex-col">
        {revisions.map((revision, index) => (
          <li
            key={revision.id}
            className={cn(
              "flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between",
              index === 0 && "pt-0",
            )}
          >
            <div className="flex min-w-0 items-start gap-3.5">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border",
                  index === 0
                    ? "border-navy-900 bg-navy-900 text-gold-200"
                    : "border-line-2 text-muted",
                )}
              >
                <Icon name="history" size={16} />
              </span>

              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-navy-900">
                  {formatJalaliDateTime(revision.at)}
                  {index === 0 && (
                    <span className="ms-2 rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.625rem] font-normal text-muted">
                      آخرین نسخه پیش از ویرایش فعلی
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  {revision.note ? `${revision.note} — ` : ""}
                  توسط {revision.authorName}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="eye"
                onClick={() => setComparing(revision)}
              >
                مقایسه
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon="refresh"
                onClick={() => setRestoring(revision)}
              >
                بازگردانی
              </Button>
            </div>
          </li>
        ))}
      </ol>

      {/* -- comparison ----------------------------------------------------- */}
      <Modal
        open={Boolean(comparing)}
        onClose={() => setComparing(null)}
        title="مقایسه با نسخه فعلی"
        description={
          comparing
            ? `نسخه ${formatJalaliDateTime(comparing.at)} در برابر محتوای فعلی صفحه.`
            : undefined
        }
        size="lg"
      >
        {changes.length === 0 ? (
          <p className="rounded-sm border border-dashed border-line-2 px-4 py-8 text-center text-[0.875rem] text-muted">
            تفاوتی میان این نسخه و محتوای فعلی وجود ندارد.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {changes.map((change) => (
              <li
                key={change.label}
                className="rounded-sm border border-line-2 bg-white p-4"
              >
                <p className="text-[0.8125rem] font-semibold text-navy-900">
                  {change.label}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xs border border-danger/20 bg-danger-soft/50 p-3">
                    <p className="text-[0.6875rem] font-medium text-danger">
                      نسخه پیشین
                    </p>
                    <p className="mt-1.5 line-clamp-4 text-[0.8125rem] leading-[1.9] text-ink-2">
                      {change.before}
                    </p>
                  </div>
                  <div className="rounded-xs border border-success/20 bg-success-soft/50 p-3">
                    <p className="text-[0.6875rem] font-medium text-success">
                      نسخه فعلی
                    </p>
                    <p className="mt-1.5 line-clamp-4 text-[0.8125rem] leading-[1.9] text-ink-2">
                      {change.after}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* -- restore -------------------------------------------------------- */}
      <ConfirmDialog
        open={Boolean(restoring)}
        onClose={() => setRestoring(null)}
        onConfirm={() => {
          if (!restoring) return;
          const data = new FormData();
          data.set(CSRF_FIELD, csrfToken);
          data.set("revisionId", restoring.id);
          formAction(data);
        }}
        pending={pending}
        tone="primary"
        title="بازگردانی نسخه پیشین"
        confirmLabel="بازگردانی"
        message={
          <>
            محتوای فعلی صفحه با نسخه{" "}
            <span className="font-semibold">
              {restoring ? formatJalaliDateTime(restoring.at) : ""}
            </span>{" "}
            جایگزین می‌شود.
            <br />
            <br />
            پیش از بازگردانی، از وضعیت فعلی صفحه نیز یک نسخه ذخیره می‌شود؛ پس
            در صورت اشتباه می‌توانید به همین حالت برگردید.
          </>
        }
      />
    </div>
  );
}
