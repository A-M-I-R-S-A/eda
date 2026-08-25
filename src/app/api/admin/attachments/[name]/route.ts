import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/db/store";
import { getAdminSession } from "@/lib/auth/current-user";
import { readStoredUpload } from "@/lib/security/upload";
import { RATE_LIMITS, limitByIp } from "@/lib/security/rate-limit";

/**
 * Authenticated download for case attachments.
 *
 * Uploads deliberately live outside `public/`, so this handler is the only way
 * to read one. It:
 *   • requires an admin/editor session;
 *   • only serves a `storedName` that actually appears on a request record,
 *     so a valid-looking filename cannot be fished for;
 *   • forces `Content-Disposition: attachment` and `nosniff` so a stored
 *     image or HTML-ish payload can never execute in the browser;
 *   • sends `Cache-Control: private, no-store` so confidential documents are
 *     not written to shared caches.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await getAdminSession("operations");
  if (!session) {
    return NextResponse.json(
      { error: "دسترسی غیرمجاز" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = await limitByIp(
    "attachment",
    RATE_LIMITS.upload.limit * 4,
    RATE_LIMITS.upload.windowMs,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "تعداد درخواست‌ها بیش از حد مجاز است." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { name } = await params;

  // The file must be referenced by an actual record.
  const db = await readDb();
  const attachment = db.requests
    .flatMap((r) => r.attachments)
    .find((file) => file.storedName === name);

  if (!attachment) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }

  const buffer = await readStoredUpload(name);
  if (!buffer) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }

  // RFC 5987 encoding so Persian filenames survive the header.
  const encodedName = encodeURIComponent(attachment.originalName);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
