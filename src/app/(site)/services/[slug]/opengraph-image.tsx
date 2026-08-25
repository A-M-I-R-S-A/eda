import { getServiceBySlug, getSettings } from "@/lib/db";
import { SERVICE_CATEGORY } from "@/lib/config/labels";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const dynamic = "force-dynamic";

export const alt = "خدمات مؤسسه داوری دادآور";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  // Next.js 16 passes route params as a Promise — reading `params.slug`
  // directly yields `undefined` and silently falls back to the generic card.
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [service, settings] = await Promise.all([
    getServiceBySlug(slug),
    getSettings(),
  ]);

  return renderOgImage({
    institution: settings.institutionName,
    kicker: service ? SERVICE_CATEGORY[service.category] : "خدمات",
    title: service?.title ?? "خدمات حقوقی و داوری",
    subtitle: service?.shortDescription,
  });
}
