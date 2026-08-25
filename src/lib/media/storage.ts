import "server-only";

import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { MediaKind } from "@/types";
import { newUploadName } from "@/lib/utils/id";

/**
 * Media library storage.
 *
 * Deliberately separate from `@/lib/security/upload`, which handles *case
 * documents*: those are confidential, live outside `public/` and are only
 * readable through an authenticated route. Media library files are the
 * opposite — they are meant to be served to the public — so they get their own
 * directory, their own allow-list and their own public route.
 *
 * What the two share is the important part: an unguessable stored filename, an
 * extension *and* MIME allow-list, a magic-byte check and a size cap, all
 * applied before anything reaches disk.
 */

export const MEDIA_DIR = resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.MEDIA_DIR || ".data/media",
);

/** 8 MB. Larger than case documents because hero imagery is legitimately big. */
export const MAX_MEDIA_BYTES = Number(
  process.env.MAX_MEDIA_BYTES || 8 * 1024 * 1024,
);

/** extension → { mime types, library kind } */
const ALLOWED: Record<string, { mimes: string[]; kind: MediaKind }> = {
  jpg: { mimes: ["image/jpeg"], kind: "image" },
  jpeg: { mimes: ["image/jpeg"], kind: "image" },
  png: { mimes: ["image/png"], kind: "image" },
  webp: { mimes: ["image/webp"], kind: "image" },
  avif: { mimes: ["image/avif"], kind: "image" },
  gif: { mimes: ["image/gif"], kind: "image" },
  svg: { mimes: ["image/svg+xml"], kind: "image" },
  mp4: { mimes: ["video/mp4"], kind: "video" },
  webm: { mimes: ["video/webm"], kind: "video" },
  pdf: { mimes: ["application/pdf"], kind: "document" },
  doc: { mimes: ["application/msword"], kind: "document" },
  docx: {
    mimes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    kind: "document",
  },
  xls: { mimes: ["application/vnd.ms-excel"], kind: "document" },
  xlsx: {
    mimes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    kind: "document",
  },
};

export const MEDIA_ACCEPT = Object.keys(ALLOWED)
  .map((ext) => `.${ext}`)
  .join(",");

export const MEDIA_HINT =
  "فرمت‌های مجاز: تصویر (JPG، PNG، WEBP، AVIF، GIF، SVG)، ویدئو (MP4، WEBM) و سند (PDF، Word، Excel) — حداکثر ۸ مگابایت.";

const SIGNATURES: { ext: string[]; bytes: number[]; offset?: number }[] = [
  { ext: ["pdf"], bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: ["jpg", "jpeg"], bytes: [0xff, 0xd8, 0xff] },
  { ext: ["png"], bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ["gif"], bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: ["webp", "avif"], bytes: [0x52, 0x49, 0x46, 0x46] },
  { ext: ["docx", "xlsx"], bytes: [0x50, 0x4b, 0x03, 0x04] },
  { ext: ["doc", "xls"], bytes: [0xd0, 0xcf, 0x11, 0xe0] },
];

function extensionOf(filename: string): string {
  return extname(filename).replace(".", "").toLowerCase();
}

function signatureMatches(ext: string, head: Uint8Array): boolean {
  const rules = SIGNATURES.filter((rule) => rule.ext.includes(ext));
  if (!rules.length) return true;
  return rules.some((rule) =>
    rule.bytes.every((byte, index) => head[(rule.offset ?? 0) + index] === byte),
  );
}

/* -------------------------------------------------------------------------- */
/*  SVG sanitisation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * SVG is an executable document format.
 *
 * An uploaded `.svg` served from our own origin can carry `<script>` or an
 * `onload=` handler and run as first-party JavaScript — a stored-XSS vector
 * that no amount of MIME checking catches. Rather than refuse SVG (it is the
 * right format for a logo), scripting constructs are stripped before the file
 * is written.
 */
export function sanitizeSvg(source: string): string {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "")
    .replace(/<!ENTITY[\s\S]*?>/gi, "");
}

/* -------------------------------------------------------------------------- */
/*  Image dimensions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Reads intrinsic dimensions straight from the file header.
 *
 * A few dozen bytes of parsing avoids pulling an image library into the server
 * bundle for what the media list needs: a "1600 × 900" label and enough
 * information to warn about an oversized hero image.
 */
export function readImageSize(
  buffer: Buffer,
  ext: string,
): { width: number; height: number } | null {
  try {
    if (ext === "png" && buffer.length > 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }

    if (ext === "gif" && buffer.length > 10) {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
      };
    }

    if ((ext === "jpg" || ext === "jpeg") && buffer.length > 4) {
      let offset = 2;
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0–SOF15, excluding the DHT/JPG/DAC markers that share the range.
        const isStartOfFrame =
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc;

        if (isStartOfFrame) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
      return null;
    }

    if (ext === "webp" && buffer.length > 30) {
      const format = buffer.toString("ascii", 12, 16);
      if (format === "VP8X") {
        return {
          width: 1 + buffer.readUIntLE(24, 3),
          height: 1 + buffer.readUIntLE(27, 3),
        };
      }
      if (format === "VP8 ") {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
        };
      }
      if (format === "VP8L") {
        const bits = buffer.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
      return null;
    }

    if (ext === "svg") {
      const text = buffer.toString("utf8", 0, 2048);
      const viewBox = /viewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i.exec(
        text,
      );
      if (viewBox) {
        return {
          width: Math.round(Number(viewBox[1])),
          height: Math.round(Number(viewBox[2])),
        };
      }
      const width = /\swidth\s*=\s*["'](\d+)/i.exec(text);
      const height = /\sheight\s*=\s*["'](\d+)/i.exec(text);
      if (width && height) {
        return { width: Number(width[1]), height: Number(height[1]) };
      }
    }
  } catch {
    // A malformed header is not a reason to reject the upload; the library
    // simply shows "—" for dimensions.
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Store                                                                     */
/* -------------------------------------------------------------------------- */

export interface StoredMedia {
  fileName: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  width?: number;
  height?: number;
}

export type MediaUploadResult =
  | { ok: true; file: StoredMedia }
  | { ok: false; message: string };

export async function storeMediaFile(file: File): Promise<MediaUploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, message: "فایلی انتخاب نشده است." };
  }

  if (file.size > MAX_MEDIA_BYTES) {
    const limit = Math.round(MAX_MEDIA_BYTES / (1024 * 1024));
    return {
      ok: false,
      message: `حجم فایل «${file.name}» بیش از حد مجاز است. حداکثر ${limit} مگابایت.`,
    };
  }

  const ext = extensionOf(file.name);
  const rule = ALLOWED[ext];

  if (!rule) {
    return {
      ok: false,
      message: `فرمت فایل «${file.name}» مجاز نیست. ${MEDIA_HINT}`,
    };
  }

  const declared = file.type?.toLowerCase();
  if (
    declared &&
    declared !== "application/octet-stream" &&
    !rule.mimes.includes(declared)
  ) {
    return {
      ok: false,
      message: `نوع فایل «${file.name}» با پسوند آن هم‌خوانی ندارد.`,
    };
  }

  let buffer = Buffer.from(await file.arrayBuffer());

  if (!signatureMatches(ext, buffer.subarray(0, 12))) {
    return {
      ok: false,
      message: `محتوای فایل «${file.name}» با پسوند آن مطابقت ندارد.`,
    };
  }

  if (ext === "svg") {
    buffer = Buffer.from(sanitizeSvg(buffer.toString("utf8")), "utf8");
  }

  const size = readImageSize(buffer, ext);
  const fileName = newUploadName(ext);

  try {
    await mkdir(MEDIA_DIR, { recursive: true });
    await writeFile(join(MEDIA_DIR, fileName), buffer);
  } catch (error) {
    console.error("[media] write failed", error);
    return {
      ok: false,
      message: "ذخیره‌سازی فایل با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }

  return {
    ok: true,
    file: {
      fileName,
      originalName: basename(file.name).slice(0, 180),
      mimeType: rule.mimes[0],
      kind: rule.kind,
      size: buffer.byteLength,
      width: size?.width,
      height: size?.height,
    },
  };
}

/** Matches exactly what `newUploadName` produces, so traversal is impossible. */
const SAFE_NAME = /^[a-z0-9]+-[a-f0-9]{24}\.[a-z0-9]{1,5}$/i;

export function isStoredMediaName(name: string): boolean {
  return SAFE_NAME.test(name);
}

export async function readMediaFile(
  fileName: string,
): Promise<{ body: Buffer; mimeType: string } | null> {
  if (!isStoredMediaName(fileName)) return null;

  const ext = extensionOf(fileName);
  const rule = ALLOWED[ext];
  if (!rule) return null;

  try {
    const body = await readFile(join(MEDIA_DIR, fileName));
    return { body, mimeType: rule.mimes[0] };
  } catch {
    return null;
  }
}

export async function deleteMediaFile(fileName: string): Promise<boolean> {
  if (!isStoredMediaName(fileName)) return false;
  try {
    await unlink(join(MEDIA_DIR, fileName));
    return true;
  } catch {
    return false;
  }
}

export async function mediaFileExists(fileName: string): Promise<boolean> {
  if (!isStoredMediaName(fileName)) return false;
  try {
    await stat(join(MEDIA_DIR, fileName));
    return true;
  } catch {
    return false;
  }
}

/** Public URL for a stored file. */
export function mediaUrl(fileName: string): string {
  return `/media/${fileName}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}
