import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { AttachmentMeta } from "@/types";
import { newId, newUploadName } from "@/lib/utils/id";
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_UPLOAD_TYPES,
  DEFAULT_MAX_UPLOAD_BYTES,
  MAX_FILES_PER_REQUEST,
  UPLOAD_HINT,
} from "./upload-constants";

export { ACCEPT_ATTRIBUTE, MAX_FILES_PER_REQUEST, UPLOAD_HINT };

/**
 * Secure handling of client-supplied documents.
 *
 * Case files are confidential, so uploads are:
 *   • stored OUTSIDE `public/` — they are never statically served;
 *   • renamed to an unguessable filename (no user-controlled path segment);
 *   • checked against an allow-list of both extension *and* MIME type;
 *   • sniffed for magic bytes so a renamed `.exe` cannot pose as a PDF;
 *   • size-capped before anything touches disk.
 *
 * Retrieval goes through an authenticated route handler
 * (`/api/admin/attachments/[name]`), never a direct URL.
 */

export const UPLOAD_DIR = resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.UPLOAD_DIR || ".uploads",
);

export const MAX_UPLOAD_BYTES = Number(
  process.env.MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES,
);

const ALLOWED = ALLOWED_UPLOAD_TYPES;

/** Magic-byte prefixes for the formats we can cheaply verify. */
const SIGNATURES: { ext: string[]; bytes: number[]; offset?: number }[] = [
  { ext: ["pdf"], bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: ["jpg", "jpeg"], bytes: [0xff, 0xd8, 0xff] },
  { ext: ["png"], bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ["webp"], bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
  // OOXML (docx/xlsx) are ZIP containers.
  { ext: ["docx", "xlsx"], bytes: [0x50, 0x4b, 0x03, 0x04] },
  { ext: ["doc", "xls"], bytes: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE2
];

function extensionOf(filename: string): string {
  return extname(filename).replace(".", "").toLowerCase();
}

function signatureMatches(ext: string, head: Uint8Array): boolean {
  const rules = SIGNATURES.filter((s) => s.ext.includes(ext));
  if (!rules.length) return true; // nothing to check for this type
  return rules.some((rule) =>
    rule.bytes.every((byte, i) => head[(rule.offset ?? 0) + i] === byte),
  );
}

export type UploadError =
  | { code: "too-many"; message: string }
  | { code: "too-large"; message: string }
  | { code: "bad-type"; message: string }
  | { code: "corrupt"; message: string }
  | { code: "io"; message: string };

export type UploadOutcome =
  | { ok: true; attachments: AttachmentMeta[] }
  | { ok: false; error: UploadError };

/** Validates and stores a batch of uploaded files. */
export async function storeUploads(files: File[]): Promise<UploadOutcome> {
  const usable = files.filter((f) => f && f.size > 0);

  if (usable.length > MAX_FILES_PER_REQUEST) {
    return {
      ok: false,
      error: {
        code: "too-many",
        message: `حداکثر ${MAX_FILES_PER_REQUEST} فایل قابل بارگذاری است.`,
      },
    };
  }

  const attachments: AttachmentMeta[] = [];

  for (const file of usable) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        error: {
          code: "too-large",
          message: `حجم فایل «${file.name}» بیش از حد مجاز است. حداکثر اندازه هر فایل ۵ مگابایت است.`,
        },
      };
    }

    const ext = extensionOf(file.name);
    const allowedMimes = ALLOWED[ext];

    if (!allowedMimes) {
      return {
        ok: false,
        error: {
          code: "bad-type",
          message: `فرمت فایل «${file.name}» مجاز نیست. ${UPLOAD_HINT}`,
        },
      };
    }

    // Browsers occasionally send an empty or generic type; the magic-byte
    // check below is the real gate, so only reject a *conflicting* type.
    const declared = file.type?.toLowerCase();
    if (declared && declared !== "application/octet-stream" && !allowedMimes.includes(declared)) {
      return {
        ok: false,
        error: {
          code: "bad-type",
          message: `نوع فایل «${file.name}» با پسوند آن هم‌خوانی ندارد.`,
        },
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!signatureMatches(ext, buffer.subarray(0, 8))) {
      return {
        ok: false,
        error: {
          code: "corrupt",
          message: `محتوای فایل «${file.name}» با پسوند آن مطابقت ندارد.`,
        },
      };
    }

    const storedName = newUploadName(ext);

    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(join(UPLOAD_DIR, storedName), buffer);
    } catch (error) {
      console.error("[upload] write failed", error);
      return {
        ok: false,
        error: {
          code: "io",
          message: "ذخیره‌سازی فایل با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
        },
      };
    }

    attachments.push({
      id: newId(),
      // Keep only the base name; never trust a client-supplied path.
      originalName: basename(file.name).slice(0, 180),
      storedName,
      mimeType: allowedMimes[0],
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  }

  return { ok: true, attachments };
}

/**
 * Reads a stored attachment. The name is validated against the exact pattern
 * `newUploadName` produces, which makes path traversal impossible.
 */
export async function readStoredUpload(
  storedName: string,
): Promise<Buffer | null> {
  if (!/^[a-z0-9]+-[a-f0-9]{24}\.[a-z0-9]{1,5}$/i.test(storedName)) return null;

  try {
    return await readFile(join(UPLOAD_DIR, storedName));
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}
