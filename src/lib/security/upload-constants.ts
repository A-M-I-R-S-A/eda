/**
 * Upload rules shared by the browser and the server.
 *
 * `upload.ts` (which does the real validation) is `server-only`, so the parts
 * the file picker needs — accepted extensions, size cap, help text — live
 * here. The client uses them for immediate feedback; the server re-checks
 * everything, including magic bytes.
 */

/** extension → accepted MIME types */
export const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_UPLOAD_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export const MAX_FILES_PER_REQUEST = 5;

/** 5 MB. Mirrored by `MAX_UPLOAD_BYTES` on the server, which honours the env. */
export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const UPLOAD_HINT =
  "فرمت‌های مجاز: PDF، تصویر (JPG/PNG/WEBP)، Word و Excel — حداکثر ۵ مگابایت برای هر فایل و ۵ فایل در هر درخواست.";
