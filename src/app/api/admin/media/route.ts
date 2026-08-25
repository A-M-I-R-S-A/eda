import { NextResponse } from "next/server";
import { createMedia, listMedia, recordAudit } from "@/lib/db";
import { getAdminSession, getRequestIp } from "@/lib/auth/current-user";
import { verifyCsrf } from "@/lib/security/csrf";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { mediaUrl, storeMediaFile } from "@/lib/media/storage";
import type { MediaKind } from "@/types";

/**
 * Media upload endpoint.
 *
 * A route handler rather than a Server Action because the media picker uploads
 * from a dialog and needs the created record back immediately to select it —
 * an action would force a full form round-trip and lose the dialog state.
 *
 * The same three gates as every mutating action apply: session, capability,
 * CSRF token.
 */

export async function POST(request: Request) {
  const session = await getAdminSession("media");
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "شما مجوز بارگذاری فایل را ندارید." },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  if (!(await verifyCsrf(formData.get(CSRF_FIELD)))) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "اعتبار این درخواست منقضی شده است. صفحه را تازه‌سازی کرده و دوباره تلاش کنید.",
      },
      { status: 403 },
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { ok: false, message: "فایلی برای بارگذاری انتخاب نشده است." },
      { status: 400 },
    );
  }

  if (files.length > 10) {
    return NextResponse.json(
      { ok: false, message: "حداکثر ۱۰ فایل در هر بار قابل بارگذاری است." },
      { status: 400 },
    );
  }

  const created = [];
  const failed: string[] = [];

  for (const file of files) {
    const stored = await storeMediaFile(file);

    if (!stored.ok) {
      failed.push(stored.message);
      continue;
    }

    const asset = await createMedia({
      fileName: stored.file.fileName,
      // The original filename is the most useful default title an
      // administrator can then rename in the library.
      title: stored.file.originalName.replace(/\.[^.]+$/, ""),
      alt: "",
      mimeType: stored.file.mimeType,
      kind: stored.file.kind,
      size: stored.file.size,
      width: stored.file.width,
      height: stored.file.height,
      url: mediaUrl(stored.file.fileName),
      uploadedById: session.sub,
      uploadedByName: session.name,
    });

    created.push(asset);
  }

  if (created.length > 0) {
    await recordAudit({
      actorId: session.sub,
      actorName: session.name,
      actorRole: session.role,
      action: "upload",
      entity: "media",
      entityLabel:
        created.length === 1
          ? created[0].title
          : `${created.length} فایل`,
      detail: created.map((asset) => asset.fileName).join("، "),
      ip: await getRequestIp(),
    });
  }

  if (created.length === 0) {
    return NextResponse.json(
      { ok: false, message: failed[0] ?? "بارگذاری فایل انجام نشد." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    items: created,
    // Partial success is reported rather than hidden: the caller shows which
    // files were rejected while keeping the ones that succeeded.
    warnings: failed,
  });
}

/** Browse endpoint backing the media picker dialog. */
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "دسترسی مجاز نیست." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const result = await listMedia({
    search: url.searchParams.get("q") || undefined,
    kind: (url.searchParams.get("kind") as MediaKind | "all") || "all",
    page: Number(url.searchParams.get("page") || 1),
    pageSize: Number(url.searchParams.get("pageSize") || 24),
  });

  return NextResponse.json({ ok: true, ...result });
}
