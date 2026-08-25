"use client";

import { useActionState, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { DragHandle, SortableList } from "./sortable";
import { Toast, useUnsavedChanges } from "./dialog";
import { useActionResult } from "./use-action-result";

/**
 * Drag-to-reorder for any ordered collection.
 *
 * Ordering is saved explicitly rather than on every drop. Auto-saving each
 * micro-move would fire a request per pixel-gesture and leave the list in a
 * half-applied state if one failed; an explicit save makes the whole new order
 * one atomic write the administrator chose to make.
 */

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ReorderPanel<T extends { id: string }>({
  items,
  action,
  csrfToken,
  renderItem,
  emptyLabel = "موردی برای مرتب‌سازی وجود ندارد.",
  itemLabel = (item: T) => item.id,
}: {
  items: T[];
  action: Action;
  csrfToken: string;
  renderItem: (item: T, index: number) => ReactNode;
  emptyLabel?: string;
  itemLabel?: (item: T) => string;
}) {
  const [ordered, setOrdered] = useState(items);
  const [toast, setToast] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );

  /**
   * The list is re-seeded whenever the server sends a different set of items
   * (something was added or deleted elsewhere), but *not* on every render —
   * that would discard an in-progress drag.
   */
  const serverIds = useMemo(() => items.map((item) => item.id).join(","), [items]);
  const [lastServerIds, setLastServerIds] = useState(serverIds);
  if (serverIds !== lastServerIds) {
    setLastServerIds(serverIds);
    setOrdered(items);
  }

  const dirty = ordered.map((item) => item.id).join(",") !== serverIds;

  useUnsavedChanges(
    dirty,
    "ترتیب جدید هنوز ذخیره نشده است. اگر از این صفحه خارج شوید، تغییر ترتیب از دست می‌رود.",
  );

  useActionResult(state, (result) => setToast(result.message ?? null));

  if (items.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-line-2 px-4 py-8 text-center text-[0.875rem] text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input
        type="hidden"
        name="ids"
        value={ordered.map((item) => item.id).join(",")}
      />

      {state.status === "error" && <Alert tone="danger">{state.message}</Alert>}

      <SortableList
        items={ordered}
        getKey={(item) => item.id}
        onReorder={setOrdered}
      >
        {(item, props) => (
          <div
            className={cn(
              "flex items-center gap-3 rounded-sm border bg-white px-3 py-2.5",
              props.isDragging ? "border-navy-400" : "border-line-2",
            )}
          >
            <DragHandle {...props} label={itemLabel(item)} />
            <div className="min-w-0 flex-1">{renderItem(item, props.index)}</div>
            <span className="shrink-0 text-[0.75rem] text-muted-2 tabular-nums">
              {props.index + 1}
            </span>
          </div>
        )}
      </SortableList>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.75rem] text-muted">
          <Icon name="info" size={14} className="text-gold-600" />
          با کشیدن یا دکمه‌های بالا و پایین، ترتیب را تغییر دهید.
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!dirty}
          loading={pending}
          loadingText="در حال ذخیره…"
        >
          ذخیره ترتیب
        </Button>
      </div>

      <Toast
        message={toast}
        tone={state.status === "error" ? "danger" : "success"}
        onDismiss={() => setToast(null)}
      />
    </form>
  );
}
