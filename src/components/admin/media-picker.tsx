"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import type { MediaAsset, MediaKind } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert, EmptyState, LoadingState } from "@/components/ui/states";
import { Modal } from "./dialog";

/**
 * Media library browser and picker.
 *
 * The single control every image, video and document field in the CMS uses.
 * It exists so an administrator uploads a logo *once* and then selects it
 * everywhere else, rather than re-uploading the same file into each field —
 * which is what makes a media library a library rather than a file input.
 *
 * Uploads go to a route handler instead of a Server Action because the dialog
 * needs the created record back immediately in order to select it; an action
 * would force a form round-trip and close the dialog.
 */

const KIND_FILTERS: { value: MediaKind | "all"; label: string }[] = [
  { value: "all", label: "همه فایل‌ها" },
  { value: "image", label: "تصاویر" },
  { value: "video", label: "ویدئو" },
  { value: "document", label: "اسناد" },
];

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${fa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${fa((bytes / 1024).toFixed(0))} کیلوبایت`;
  return `${fa((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

interface LibraryResponse {
  ok: boolean;
  items?: MediaAsset[];
  message?: string;
  warnings?: string[];
  total?: number;
}

/* -------------------------------------------------------------------------- */
/*  Picker dialog                                                             */
/* -------------------------------------------------------------------------- */

export function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  csrfToken,
  kind = "all",
  title = "انتخاب از کتابخانه رسانه",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  csrfToken: string;
  kind?: MediaKind | "all";
  title?: string;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaKind | "all">(kind);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: "60" });
      if (search) params.set("q", search);
      if (filter !== "all") params.set("kind", filter);

      const response = await fetch(`/api/admin/media?${params}`, {
        cache: "no-store",
      });
      const data: LibraryResponse = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "دریافت فهرست رسانه‌ها انجام نشد.");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    if (!open) return;
    // Debounced so typing in the search box does not fire a request per key.
    const timer = window.setTimeout(load, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [open, load, search]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setError(null);

    const body = new FormData();
    body.set(CSRF_FIELD, csrfToken);
    for (const file of files) body.append("files", file);

    try {
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const data: LibraryResponse = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "بارگذاری فایل انجام نشد.");
        return;
      }

      // Partial failures are surfaced rather than hidden: the files that did
      // upload are selectable, and the administrator is told about the rest.
      if (data.warnings?.length) setError(data.warnings[0]);

      const uploaded = data.items ?? [];
      setItems((prev) => [...uploaded, ...prev]);
      if (uploaded.length === 1) setSelected(uploaded[0].id);
    } catch {
      setError("بارگذاری فایل انجام نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirm = () => {
    const asset = items.find((item) => item.id === selected);
    if (asset) {
      onSelect(asset);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            انصراف
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={confirm}
            disabled={!selected}
          >
            انتخاب فایل
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="media-search" className="sr-only">
              جست‌وجوی فایل
            </label>
            <input
              id="media-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجو بر اساس نام فایل…"
              className="h-11 w-full rounded-sm border border-line-2 bg-white ps-3.5 pe-10 text-[0.875rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]"
            />
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-2"
            />
          </div>

          <div className="relative shrink-0">
            <label htmlFor="media-kind" className="sr-only">
              نوع فایل
            </label>
            <select
              id="media-kind"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as MediaKind | "all")
              }
              className="h-11 w-full cursor-pointer appearance-none rounded-sm border border-line-2 bg-white ps-3.5 pe-9 text-[0.875rem] focus:border-navy-600 focus:outline-none sm:w-40"
            >
              {KIND_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              size={15}
              className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted"
            />
          </div>

          <Button
            variant="outline"
            size="md"
            icon="upload"
            loading={uploading}
            loadingText="در حال بارگذاری…"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            بارگذاری فایل
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={upload}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {loading ? (
          <LoadingState label="در حال دریافت فایل‌ها…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon="image"
            title="فایلی یافت نشد"
            description={
              search
                ? "جست‌وجوی شما نتیجه‌ای نداشت. عبارت دیگری را امتحان کنید."
                : "هنوز فایلی بارگذاری نشده است. با دکمه «بارگذاری فایل» شروع کنید."
            }
          />
        ) : (
          <ul className="grid max-h-[52dvh] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((asset) => {
              const active = selected === asset.id;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(asset.id)}
                    onDoubleClick={() => {
                      onSelect(asset);
                      onClose();
                    }}
                    aria-pressed={active}
                    className={cn(
                      "group flex w-full flex-col overflow-hidden rounded-sm border bg-white text-start transition-colors",
                      active
                        ? "border-navy-900 shadow-[0_0_0_1px_var(--color-navy-900)]"
                        : "border-line hover:border-navy-400",
                    )}
                  >
                    <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-paper-2">
                      {asset.kind === "image" ? (
                        <Image
                          src={asset.url}
                          alt={asset.alt || asset.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 20vw"
                          className="object-cover"
                        />
                      ) : (
                        <Icon
                          name={asset.kind === "video" ? "play" : "document"}
                          size={28}
                          className="text-muted-2"
                        />
                      )}

                      {active && (
                        <span className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-navy-900 text-white">
                          <Icon name="check" size={14} weight={2.5} />
                        </span>
                      )}
                    </span>

                    <span className="flex min-w-0 flex-col gap-0.5 p-2.5">
                      <span className="truncate text-[0.75rem] font-medium text-navy-900">
                        {asset.title}
                      </span>
                      <span className="text-[0.6875rem] text-muted-2">
                        {asset.width && asset.height
                          ? `${fa(asset.width)}×${fa(asset.height)}`
                          : formatSize(asset.size)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A media field: preview, pick, replace, clear.
 *
 * Posts the chosen URL through a hidden input, so it works inside an ordinary
 * form submission with no client-side plumbing at the call site.
 */
export function MediaField({
  name,
  label,
  value,
  onChange,
  csrfToken,
  hint,
  kind = "image",
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  csrfToken: string;
  hint?: string;
  kind?: MediaKind | "all";
  error?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.875rem] font-semibold text-navy-800">{label}</span>

      <input type="hidden" name={name} value={value} />

      {value ? (
        <div className="flex items-center gap-4 rounded-sm border border-line-2 bg-white p-3">
          <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-paper-2">
            {kind === "image" || /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(value) ? (
              <Image
                src={value}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <Icon name="document" size={22} className="text-muted-2" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span
              dir="ltr"
              className="block truncate text-start text-[0.8125rem] text-ink-2"
            >
              {value}
            </span>
          </span>

          <span className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-sm border border-line-2 px-3 text-[0.75rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
            >
              <Icon name="refresh" size={14} />
              تغییر
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="حذف تصویر"
              className="flex size-9 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
            >
              <Icon name="trash" size={15} />
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2.5 rounded-sm border border-dashed border-line-2 bg-white px-4 py-6 text-[0.875rem] font-medium text-navy-800 transition-colors hover:border-navy-500 hover:bg-paper-2/50"
        >
          <Icon name="image" size={18} className="text-muted" />
          انتخاب از کتابخانه رسانه
        </button>
      )}

      {hint && !error?.length && (
        <p className="text-[0.8125rem] leading-relaxed text-muted">{hint}</p>
      )}
      {error?.length ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-[0.8125rem] text-danger"
        >
          <Icon name="alert" size={15} className="mt-0.5" />
          {error[0]}
        </p>
      ) : null}

      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(asset) => onChange(asset.url)}
        csrfToken={csrfToken}
        kind={kind}
      />
    </div>
  );
}
