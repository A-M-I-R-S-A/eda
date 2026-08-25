import { NextResponse } from "next/server";
import { readMediaFile } from "@/lib/media/storage";

/**
 * Public media delivery.
 *
 * Media library files live outside `public/` so the application controls how
 * they are served — the filename is validated against the exact pattern the
 * uploader produces, which makes path traversal impossible, and the response
 * carries the MIME type recorded at upload rather than one derived from the
 * request.
 *
 * `nosniff` plus an explicit `Content-Disposition: inline` stops a browser
 * from reinterpreting a stored file as something more dangerous than it is.
 */

/**
 * Served per request rather than prerendered.
 *
 * `force-static` cached the *response* — including a 404 for a name that did
 * not exist yet — for a year, so a file uploaded seconds after someone
 * followed a stale link would keep 404ing until the next deploy. Freshness
 * costs nothing here: the immutable `Cache-Control` below means a browser or
 * CDN fetches any given file once and never asks again.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const file = await readMediaFile(name);

  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.body.byteLength),
      // Stored names are content-addressed by a random id and never reused,
      // so the file at a given URL can be treated as immutable.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
