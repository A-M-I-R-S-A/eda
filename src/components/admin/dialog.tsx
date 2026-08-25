"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

/**
 * Modal dialog.
 *
 * Deliberately not `<dialog>`: its native backdrop cannot be styled to match,
 * and its focus behaviour differs enough between browsers that keyboard users
 * get an inconsistent experience. This implementation owns the focus trap,
 * scroll lock and Escape handling explicitly.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), textarea, select, button',
        )
        ?.focus();
    }, 40);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      // Return focus to whatever opened the dialog.
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="بستن"
        onClick={onClose}
        className="fixed inset-0 bg-navy-950/55 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-lg border border-line bg-paper shadow-lg sm:rounded-sm",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-2xl",
          size === "lg" && "sm:max-w-4xl",
          size === "xl" && "sm:max-w-6xl",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[1rem] font-bold text-navy-950">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[0.8125rem] leading-[1.9] text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-navy-500 hover:text-navy-800"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-line bg-paper-2/60 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confirmation                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Destructive-action confirmation.
 *
 * Deliberately not `window.confirm`: a native dialog cannot be styled, reads in
 * the browser's language rather than Persian, and gives no room to explain
 * what is about to be lost. `requireTyping` adds a "type the name to confirm"
 * step for the genuinely irreversible cases.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "حذف",
  cancelLabel = "انصراف",
  tone = "danger",
  pending = false,
  requireTyping,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  /** When set, the exact text the administrator must type to proceed. */
  requireTyping?: string;
}) {
  const [typed, setTyped] = useState("");

  // Reset the confirmation phrase when the dialog opens. Derived during render
  // rather than in an effect: React applies it before paint, so the previous
  // answer never flashes in the newly-opened dialog.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setTyped("");
  }

  const canConfirm = !requireTyping || typed.trim() === requireTyping.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            loading={pending}
            disabled={!canConfirm}
            loadingText="در حال انجام…"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            tone === "danger"
              ? "bg-danger-soft text-danger"
              : "bg-info-soft text-info",
          )}
        >
          <Icon name="alert" size={20} />
        </span>
        <div className="min-w-0 flex-1 text-[0.875rem] leading-[2] text-ink-2">
          {message}
        </div>
      </div>

      {requireTyping && (
        <label className="mt-5 block">
          <span className="text-[0.8125rem] text-muted">
            برای تأیید، عبارت{" "}
            <span className="font-semibold text-navy-900">{requireTyping}</span>{" "}
            را وارد کنید:
          </span>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className="mt-2 h-11 w-full rounded-sm border border-line-2 bg-white px-3.5 text-[0.875rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]"
          />
        </label>
      )}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Unsaved changes                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Warns before losing unsaved edits.
 *
 * `beforeunload` covers reloads, closing the tab and external links. Internal
 * client-side navigation does not fire it, so link clicks are intercepted
 * during the capture phase and confirmed first — without this, the most common
 * way to lose work in a single-page admin is also the only unguarded one.
 */
export function useUnsavedChanges(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers ignore custom text now, but the value is still required.
      event.returnValue = message;
      return message;
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      // Same-page links and external origins are handled by beforeunload.
      if (/^https?:\/\//.test(href) && !href.startsWith(window.location.origin)) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}

/** Small persistent badge showing that a form has unsaved edits. */
export function DirtyBadge({ dirty }: { dirty: boolean }) {
  if (!dirty) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-2.5 py-1 text-[0.75rem] font-medium text-warning">
      <span className="size-1.5 rounded-full bg-warning" />
      تغییرات ذخیره نشده
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toast                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Transient confirmation.
 *
 * Used where an inline banner would push the layout around — a reorder, a
 * quick toggle. `role="status"` so it is announced without stealing focus.
 */
export function Toast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string | null;
  tone?: "success" | "danger";
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => onDismiss(), 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 start-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 rounded-sm border px-4 py-3 text-[0.875rem] shadow-lg",
        tone === "success"
          ? "border-success/25 bg-success-soft text-success"
          : "border-danger/25 bg-danger-soft text-danger",
      )}
    >
      <Icon name={tone === "success" ? "check-circle" : "alert"} size={17} />
      {message}
    </div>
  );
}
