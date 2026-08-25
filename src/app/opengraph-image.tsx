import { getSettings } from "@/lib/db";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const dynamic = "force-dynamic";

export const alt = "مؤسسه داوری دادآور";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Default social card, inherited by every route without its own image. */
export default async function OpengraphImage() {
  const settings = await getSettings();

  return renderOgImage({
    institution: settings.institutionName,
    title: "داوری و حل‌وفصل تخصصی اختلافات",
    subtitle: "داوری، رسیدگی به اختلافات، میانجی‌گری، مشاوره حقوقی و قراردادها",
  });
}
