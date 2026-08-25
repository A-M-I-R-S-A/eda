import { getPrincipalArbitrator, getSettings } from "@/lib/db";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const dynamic = "force-dynamic";

export const alt = "پروفایل داور مؤسسه";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [arbitrator, settings] = await Promise.all([
    getPrincipalArbitrator(),
    getSettings(),
  ]);

  return renderOgImage({
    institution: settings.institutionName,
    kicker: arbitrator?.title ?? "داور مؤسسه",
    title: arbitrator?.fullName ?? "درباره داور",
    // Empty until a biography is supplied — the card falls back to the
    // institution's own description rather than inventing a summary.
    subtitle: arbitrator?.shortBio?.trim() || settings.tagline,
  });
}
