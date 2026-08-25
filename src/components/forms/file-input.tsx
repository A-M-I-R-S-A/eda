"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { Icon } from "@/components/ui/icon";
import { firstError } from "@/components/ui/field";

/**
 * Multi-file picker with an inline list and per-file removal.
 *
 * The native `<input type="file">` is kept in the DOM (visually hidden) so the
 * form posts real files. Because a file input's `FileList` is read-only, the
 * component holds a `DataTransfer` and re-assigns `input.files` whenever the
 * selection changes — that is what makes "remove one file" work at all.
 *
 * Client-side size/extension checks are a courtesy; `storeUploads()` on the
 * server re-validates everything including magic bytes.
 */
export function FileInput({
  name,
  accept,
  maxFiles = 5,
  maxBytes = 5 * 1024 * 1024,
  hint,
  error,
  label,
  id,
}: {
  name: string;
  accept: string;
  maxFiles?: number;
  maxBytes?: number;
  hint?: string;
  error?: string | string[];
  label: string;
  id: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const message = localError ?? firstError(error);

  const commit = (next: File[]) => {
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFiles(next);
  };

  const add = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    setLocalError(null);

    const candidates = Array.from(incoming);
    const allowed = accept
      .split(",")
      .map((ext) => ext.trim().replace(".", "").toLowerCase());

    const next = [...files];

    for (const file of candidates) {
      if (next.length >= maxFiles) {
        setLocalError(`حداکثر ${fa(maxFiles)} فایل قابل بارگذاری است.`);
        break;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowed.includes(ext)) {
        setLocalError(`فرمت فایل «${file.name}» مجاز نیست.`);
        continue;
      }

      if (file.size > maxBytes) {
        setLocalError(
          `حجم فایل «${file.name}» بیش از ${fa(
            Math.round(maxBytes / (1024 * 1024)),
          )} مگابایت است.`,
        );
        continue;
      }

      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;

      next.push(file);
    }

    commit(next);
  };

  const remove = (index: number) => {
    setLocalError(null);
    commit(files.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${fa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`
      : `${fa((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline gap-1.5 text-[0.875rem] font-semibold text-navy-800">
        {label}
        <span className="text-[0.75rem] font-normal text-muted-2">(اختیاری)</span>
      </span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-sm border border-dashed bg-white p-5 transition-colors duration-250",
          dragging
            ? "border-navy-600 bg-navy-900/[0.03]"
            : message
              ? "border-danger/50"
              : "border-line-2",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          name={name}
          accept={accept}
          multiple
          className="sr-only"
          onChange={(e) => {
            // Snapshot before `add` — it re-assigns `input.files` itself, and
            // clearing `value` afterwards would wipe the selection.
            add(Array.from(e.target.files ?? []));
          }}
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-line bg-paper-2 text-navy-600">
            <Icon name="upload" size={19} />
          </span>

          <div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-[0.9375rem] font-semibold text-navy-800 underline underline-offset-4 decoration-gold-400 transition-colors hover:text-navy-950"
            >
              انتخاب فایل
            </button>
            <span className="text-[0.9375rem] text-muted"> یا فایل را اینجا رها کنید</span>
          </div>

          {hint && (
            <p className="text-[0.75rem] leading-[1.9] text-muted-2">{hint}</p>
          )}
        </div>

        {files.length > 0 && (
          <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-xs bg-paper-2 px-3 py-2.5"
              >
                <Icon name="document" size={17} className="shrink-0 text-navy-600" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-navy-900">
                    {file.name}
                  </span>
                  <span className="block text-[0.6875rem] text-muted-2">
                    {formatSize(file.size)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`حذف فایل ${file.name}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message ? (
        <p role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-danger">
          <Icon name="alert" size={15} className="mt-0.5" />
          <span>{message}</span>
        </p>
      ) : (
        files.length > 0 && (
          <p className="text-[0.75rem] text-muted">
            {fa(files.length)} فایل انتخاب شده است.
          </p>
        )
      )}
    </div>
  );
}
