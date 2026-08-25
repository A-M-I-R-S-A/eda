"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert, EmptyState } from "@/components/ui/states";
import { ConfirmDialog, Modal, Toast } from "./dialog";
import { useActionResult } from "./use-action-result";

/**
 * Create / edit / delete for a small collection, in a dialog.
 *
 * Categories and testimonials are short records that an administrator adds in
 * bursts. Sending them to a separate page and back for each one is friction
 * with nothing to show for it, so the whole loop stays on the list screen.
 *
 * The form body is supplied by the caller, which keeps this component free of
 * any knowledge of the entity it is editing.
 */

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface CollectionManagerProps<T> {
  items: T[];
  csrfToken: string;
  saveAction: Action;
  deleteAction: Action;
  /** Renders the dialog's fields. `item` is undefined when creating. */
  renderForm: (
    item: T | undefined,
    helpers: { error: (name: string) => string[] | undefined; csrfToken: string },
  ) => ReactNode;
  renderRow: (item: T) => ReactNode;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  labels: {
    addButton: string;
    createTitle: string;
    editTitle: string;
    deleteTitle: string;
    deleteMessage: (label: string) => ReactNode;
    emptyTitle: string;
    emptyDescription: string;
  };
  emptyIcon?: Parameters<typeof EmptyState>[0]["icon"];
}

export function CollectionManager<T>({
  items,
  csrfToken,
  saveAction,
  deleteAction,
  renderForm,
  renderRow,
  getId,
  getLabel,
  labels,
  emptyIcon = "tag",
}: CollectionManagerProps<T>) {
  const router = useRouter();
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<T | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [saveState, save, saving] = useActionState<FormState, FormData>(
    saveAction,
    idleState as FormState,
  );
  const [deleteState, remove, deleting] = useActionState<FormState, FormData>(
    deleteAction,
    idleState as FormState,
  );

  // UI state settles during render so the dialog never lingers for a frame
  // after the save that closed it.
  useActionResult(saveState, (result) => {
    if (result.status !== "success") return;
    setToast(result.message ?? null);
    setEditing(null);
    setCreating(false);
  });

  useActionResult(deleteState, (result) => {
    setToast(result.message ?? null);
    if (result.status === "success") setConfirming(null);
  });

  // Refreshing the server data behind the list is a genuine side effect.
  useEffect(() => {
    if (saveState.status === "success" || deleteState.status === "success") {
      router.refresh();
    }
  }, [
    saveState.status,
    saveState.submissionId,
    deleteState.status,
    deleteState.submissionId,
    router,
  ]);

  const open = creating || Boolean(editing);
  const error = (name: string) => saveState.fieldErrors?.[name];

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() => setCreating(true)}
          >
            {labels.addButton}
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={labels.emptyTitle}
            description={labels.emptyDescription}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={getId(item)}
                className="flex items-center gap-3 rounded-sm border border-line-2 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">{renderRow(item)}</div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    aria-label={`ویرایش ${getLabel(item)}`}
                    title="ویرایش"
                    className="flex size-9 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-navy-500 hover:text-navy-800"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(item)}
                    aria-label={`حذف ${getLabel(item)}`}
                    title="حذف"
                    className="flex size-9 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* -- create / edit -------------------------------------------------- */}
      <Modal
        open={open}
        onClose={close}
        title={editing ? labels.editTitle : labels.createTitle}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={close} disabled={saving}>
              انصراف
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              form="collection-form"
              loading={saving}
              loadingText="در حال ذخیره…"
            >
              ذخیره
            </Button>
          </>
        }
      >
        <form
          id="collection-form"
          action={save}
          className={cn("flex flex-col gap-5")}
        >
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          {editing && <input type="hidden" name="id" value={getId(editing)} />}

          {saveState.status === "error" && (
            <Alert tone="danger">{saveState.message}</Alert>
          )}

          {/* Remounted per record so `defaultValue` fields reset between edits. */}
          <div key={editing ? getId(editing) : "new"} className="flex flex-col gap-5">
            {renderForm(editing ?? undefined, { error, csrfToken })}
          </div>
        </form>
      </Modal>

      {/* -- delete --------------------------------------------------------- */}
      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return;
          const data = new FormData();
          data.set(CSRF_FIELD, csrfToken);
          data.set("id", getId(confirming));
          remove(data);
        }}
        pending={deleting}
        title={labels.deleteTitle}
        message={
          confirming ? labels.deleteMessage(getLabel(confirming)) : null
        }
      />

      <Toast
        message={toast}
        tone={deleteState.status === "error" ? "danger" : "success"}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
