"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Page } from "@/types";
import { ROUTES } from "@/lib/config/routes";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { deletePageAction, duplicatePageAction } from "@/lib/actions/pages";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/icon";
import { ConfirmDialog, Toast } from "./dialog";
import { useActionResult } from "./use-action-result";

/**
 * Row-level page actions: edit, duplicate, delete.
 *
 * Deletion is guarded by a typed confirmation because a page carries all of
 * its sections with it — this is the one destructive action in the CMS with no
 * partial undo, since revisions are stored per page and go with it.
 */
export function PageRowActions({
  page,
  csrfToken,
}: {
  page: Page;
  csrfToken: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [deleteState, deleteAction, deleting] = useActionState<
    FormState,
    FormData
  >(deletePageAction, idleState as FormState);

  const [duplicateState, duplicateAction, duplicating] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(duplicatePageAction, idleState as FormState<{ id: string }>);

  useActionResult(deleteState, (result) => {
    setConfirming(false);
    setToast(result.message ?? null);
  });

  useEffect(() => {
    if (deleteState.status === "success") router.refresh();
  }, [deleteState.status, deleteState.submissionId, router]);

  useEffect(() => {
    if (duplicateState.status !== "success") return;
    if (duplicateState.payload?.id) {
      router.push(ROUTES.admin.pageEdit(duplicateState.payload.id));
    }
  }, [duplicateState.status, duplicateState.submissionId, duplicateState.payload, router]);

  const iconClass =
    "flex size-9 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-navy-500 hover:text-navy-800 disabled:opacity-50";

  return (
    <>
      <Link
        href={ROUTES.admin.pageEdit(page.id)}
        aria-label="تنظیمات صفحه"
        title="تنظیمات صفحه"
        className={iconClass}
      >
        <Icon name="settings" size={16} />
      </Link>

      <Link
        href={ROUTES.admin.pageSections(page.id)}
        aria-label="ویرایش بخش‌ها"
        title="ویرایش بخش‌ها"
        className={iconClass}
      >
        <Icon name="layers" size={16} />
      </Link>

      <form action={duplicateAction}>
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        <input type="hidden" name="id" value={page.id} />
        <button
          type="submit"
          disabled={duplicating}
          aria-label="تکثیر صفحه"
          title="تکثیر صفحه"
          className={iconClass}
        >
          {duplicating ? <Spinner size={15} /> : <Icon name="duplicate" size={16} />}
        </button>
      </form>

      {!page.system && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="حذف صفحه"
          title="حذف صفحه"
          className="flex size-9 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
        >
          <Icon name="trash" size={16} />
        </button>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          const data = new FormData();
          data.set(CSRF_FIELD, csrfToken);
          data.set("id", page.id);
          deleteAction(data);
        }}
        pending={deleting}
        title="حذف صفحه"
        requireTyping={page.title}
        message={
          <>
            صفحه «<span className="font-semibold">{page.title}</span>» به‌همراه
            تمام بخش‌ها و تاریخچه نسخه‌های آن برای همیشه حذف می‌شود. این عملیات
            قابل بازگشت نیست.
            <br />
            <br />
            اگر فقط می‌خواهید صفحه از دسترس عموم خارج شود، وضعیت آن را روی
            «بایگانی» بگذارید.
          </>
        }
        confirmLabel="حذف صفحه"
      />

      <Toast
        message={toast}
        tone={deleteState.status === "error" ? "danger" : "success"}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
