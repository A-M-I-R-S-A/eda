"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { MediaAsset } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { formatJalali } from "@/lib/utils/jalali";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { deleteMediaAction, renameMediaAction } from "@/lib/actions/media";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { ConfirmDialog, Modal, Toast } from "./dialog";
import { useActionResult } from "./use-action-result";

/**
 * Media library grid.
 *
 * Upload happens here and in the picker dialog through the same route handler,
 * so a file added mid-edit is immediately available everywhere. Details,
 * renaming and deletion open in a panel rather than a separate page — the
 * library is a browsing surface, and losing your scroll position to rename a
 * file is a poor trade.
 */

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${fa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${fa((bytes / 1024).toFixed(0))} کیلوبایت`;
  return `${fa((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export function MediaLibrary({
  items,
  csrfToken,
}: {
  items: MediaAsset[];
  csrfToken: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [confirming, setConfirming] = useState<MediaAsset | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [renameState, renameAction, renaming] = useActionState<
    FormState,
    FormData
  >(renameMediaAction, idleState as FormState);

  const [deleteState, deleteAction, deleting] = useActionState<
    FormState,
    FormData
  >(deleteMediaAction, idleState as FormState);

  useActionResult(renameState, (result) => {
    setToast(result.message ?? null);
    if (result.status === "success") setSelected(null);
  });

  useActionResult(deleteState, (result) => {
    setToast(result.message ?? null);
    if (result.status === "success") {
      setConfirming(null);
      setSelected(null);
    }
  });

  useEffect(() => {
    if (renameState.status === "success" || deleteState.status === "success") {
      router.refresh();
    }
  }, [
    renameState.status,
    renameState.submissionId,
    deleteState.status,
    deleteState.submissionId,
    router,
  ]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setUploadError(null);

    const body = new FormData();
    body.set(CSRF_FIELD, csrfToken);
    for (const file of files) body.append("files", file);

    try {
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setUploadError(data.message ?? "بارگذاری فایل انجام نشد.");
        return;
      }

      if (data.warnings?.length) setUploadError(data.warnings[0]);
      setToast(`${fa(data.items.length)} فایل بارگذاری شد.`);
      router.refresh();
    } catch {
      setUploadError("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {uploadError && (
          <Alert tone="danger" title="بارگذاری با خطا مواجه شد">
            {uploadError}
          </Alert>
        )}

        {/* -- drop zone -------------------------------------------------- */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-line-2 bg-white px-6 py-8 transition-colors hover:border-navy-500 hover:bg-paper-2/40 disabled:opacity-60"
        >
          <span className="flex size-11 items-center justify-center rounded-full border border-line-2 text-navy-700">
            <Icon name="upload" size={20} />
          </span>
          <span className="text-[0.9375rem] font-semibold text-navy-900">
            {uploading ? "در حال بارگذاری…" : "بارگذاری فایل جدید"}
          </span>
          <span className="text-[0.8125rem] text-muted">
            تصویر، ویدئو یا سند — حداکثر ۸ مگابایت برای هر فایل
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={upload}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* -- grid ------------------------------------------------------- */}
        {items.length === 0 ? (
          <p className="rounded-sm border border-dashed border-line-2 px-4 py-10 text-center text-[0.875rem] text-muted">
            هنوز فایلی در کتابخانه وجود ندارد.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => setSelected(asset)}
                  className="group flex w-full flex-col overflow-hidden rounded-sm border border-line bg-white text-start transition-colors hover:border-navy-400"
                >
                  <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-paper-2">
                    {asset.kind === "image" ? (
                      <Image
                        src={asset.url}
                        alt={asset.alt || asset.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover"
                      />
                    ) : (
                      <Icon
                        name={asset.kind === "video" ? "play" : "document"}
                        size={28}
                        className="text-muted-2"
                      />
                    )}
                  </span>

                  <span className="flex min-w-0 flex-col gap-0.5 p-2.5">
                    <span className="truncate text-[0.8125rem] font-medium text-navy-900">
                      {asset.title}
                    </span>
                    <span className="flex items-center justify-between gap-2 text-[0.6875rem] text-muted-2">
                      <span>
                        {asset.width && asset.height
                          ? `${fa(asset.width)}×${fa(asset.height)}`
                          : "—"}
                      </span>
                      <span>{formatSize(asset.size)}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* -- details panel -------------------------------------------------- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="جزئیات فایل"
        size="lg"
      >
        {selected && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-line bg-paper-2">
                {selected.kind === "image" ? (
                  <Image
                    src={selected.url}
                    alt={selected.alt || selected.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-contain"
                  />
                ) : (
                  <Icon
                    name={selected.kind === "video" ? "play" : "document"}
                    size={40}
                    className="text-muted-2"
                  />
                )}
              </div>

              <dl className="mt-4 flex flex-col divide-y divide-line rounded-sm border border-line bg-white px-4">
                {[
                  {
                    label: "ابعاد",
                    value:
                      selected.width && selected.height
                        ? `${fa(selected.width)} × ${fa(selected.height)} پیکسل`
                        : "—",
                  },
                  { label: "حجم", value: formatSize(selected.size) },
                  { label: "نوع", value: selected.mimeType },
                  { label: "تاریخ بارگذاری", value: formatJalali(selected.createdAt) },
                  ...(selected.uploadedByName
                    ? [{ label: "بارگذاری توسط", value: selected.uploadedByName }]
                    : []),
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 py-2.5 text-[0.8125rem]"
                  >
                    <dt className="shrink-0 text-muted">{row.label}</dt>
                    <dd
                      dir={row.label === "نوع" ? "ltr" : undefined}
                      className="truncate text-start font-medium text-navy-900"
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex items-center gap-2 rounded-sm border border-line-2 bg-paper-2/50 px-3 py-2">
                <Icon name="link" size={15} className="shrink-0 text-muted" />
                <input
                  readOnly
                  dir="ltr"
                  value={selected.url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 bg-transparent text-start text-[0.75rem] text-ink-2 focus:outline-none"
                />
              </div>
            </div>

            <form action={renameAction} className="flex flex-col gap-5">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="id" value={selected.id} />

              {renameState.status === "error" && (
                <Alert tone="danger">{renameState.message}</Alert>
              )}

              <Field
                htmlFor="media-title"
                label="نام فایل"
                required
                hint="نامی که در کتابخانه و انتخابگر رسانه دیده می‌شود."
                error={renameState.fieldErrors?.title}
              >
                <Input
                  id="media-title"
                  name="title"
                  defaultValue={selected.title}
                  key={`title-${selected.id}`}
                />
              </Field>

              <Field
                htmlFor="media-alt"
                label="متن جایگزین (alt)"
                hint="توضیح کوتاه تصویر برای نابینایان و موتورهای جست‌وجو. برای تصاویر تزئینی خالی بگذارید."
                error={renameState.fieldErrors?.alt}
              >
                <Textarea
                  id="media-alt"
                  name="alt"
                  rows={3}
                  defaultValue={selected.alt}
                  key={`alt-${selected.id}`}
                />
              </Field>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  icon="trash"
                  onClick={() => setConfirming(selected)}
                >
                  حذف فایل
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={renaming}
                  loadingText="در حال ذخیره…"
                >
                  ذخیره تغییرات
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* -- delete --------------------------------------------------------- */}
      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return;
          const data = new FormData();
          data.set(CSRF_FIELD, csrfToken);
          data.set("id", confirming.id);
          deleteAction(data);
        }}
        pending={deleting}
        title="حذف فایل"
        confirmLabel="حذف فایل"
        message={
          <>
            فایل «<span className="font-semibold">{confirming?.title}</span>» از
            کتابخانه و از روی سرور حذف می‌شود.
            <br />
            <br />
            اگر این فایل در صفحه‌ای استفاده شده باشد، پیش از حذف به شما اطلاع
            داده می‌شود.
          </>
        }
      />

      <Toast
        message={toast}
        tone={
          renameState.status === "error" || deleteState.status === "error"
            ? "danger"
            : "success"
        }
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
