"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { Revision } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatJalaliDateTime, formatRelative } from "@/lib/utils/jalali";
import {
  SETTINGS_GROUP_LABEL,
  isSettingsGroup,
} from "@/lib/cms/settings-groups";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { restoreSettingsRevisionAction } from "@/lib/actions/settings-history";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert, EmptyState } from "@/components/ui/states";
import { ConfirmDialog, Modal, Toast } from "./dialog";
import { useActionResult } from "./use-action-result";

/**
 * Version history for site configuration.
 *
 * Settings are the one part of the CMS with no draft step — a save is live on
 * every page the moment it lands — so this screen is the undo. Each group is
 * versioned separately, so restoring the footer cannot disturb the header.
 */
export function SettingsHistory({
  revisions,
  csrfToken,
}: {
  revisions: Revision[];
  csrfToken: string;
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<Revision | null>(null);
  const [confirming, setConfirming] = useState<Revision | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [state, restore, pending] = useActionState<FormState, FormData>(
    restoreSettingsRevisionAction,
    idleState as FormState,
  );

  useActionResult(state, (result) => {
    setToast(result.message ?? null);
    if (result.status === "success") {
      setConfirming(null);
      setViewing(null);
      router.refresh();
    }
  });

  const groupLabel = (revision: Revision) =>
    isSettingsGroup(revision.entityId)
      ? SETTINGS_GROUP_LABEL[revision.entityId]
      : revision.label;

  if (revisions.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="هنوز نسخه‌ای از تنظیمات ثبت نشده است"
        description="از نخستین تغییر در تنظیمات، نسخه پیشین به‌صورت خودکار نگهداری می‌شود."
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
        {revisions.map((revision) => (
          <li
            key={revision.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3.5 last:border-0"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-2 text-muted">
              <Icon name="history" size={15} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[0.875rem] font-semibold text-navy-900">
                {groupLabel(revision)}
              </p>
              <p className="mt-0.5 text-[0.75rem] text-muted">
                {formatRelative(revision.at)} — توسط {revision.authorName}
                {revision.note ? ` — ${revision.note}` : ""}
              </p>
            </div>

            <span className="shrink-0 text-[0.6875rem] text-muted-2 tabular-nums">
              {formatJalaliDateTime(revision.at)}
            </span>

            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon="eye"
                onClick={() => setViewing(revision)}
              >
                مشاهده
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="refresh"
                onClick={() => setConfirming(revision)}
              >
                بازگردانی
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? `نسخه ${groupLabel(viewing)}` : "نسخه تنظیمات"}
        size="lg"
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <p className="text-[0.875rem] text-muted">
              مقادیر ثبت‌شده در {formatJalaliDateTime(viewing.at)}.
            </p>

            {/*
              Settings groups differ too much in shape for a field-by-field
              table to be worth building; the stored values are shown as they
              are, which is precise and honest about what will be restored.
            */}
            <pre
              dir="ltr"
              className={cn(
                "max-h-[24rem] overflow-auto rounded-sm border border-line",
                "bg-paper-2/60 p-4 text-start font-mono text-[0.75rem] leading-[1.9] text-ink-2",
              )}
            >
              {JSON.stringify(viewing.snapshot, null, 2)}
            </pre>

            <Button
              type="button"
              variant="outline"
              size="md"
              icon="refresh"
              onClick={() => {
                setConfirming(viewing);
                setViewing(null);
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
        title="بازگردانی تنظیمات"
        confirmLabel="بله، بازگردان"
        message={
          <>
            بخش «
            <span className="font-semibold">
              {confirming ? groupLabel(confirming) : ""}
            </span>
            » به مقادیر نسخه{" "}
            {confirming ? formatJalaliDateTime(confirming.at) : ""} بازمی‌گردد و
            بلافاصله در تمام صفحات وب‌سایت اعمال می‌شود.
            <br />
            <br />
            مقادیر فعلی پیش از بازگردانی ذخیره می‌شوند، بنابراین می‌توانید این
            کار را برگردانید.
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
