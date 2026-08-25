import { getArticleBySlug, getCategoryBySlug, getSettings } from "@/lib/db";
import { formatJalali } from "@/lib/utils/jalali";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const dynamic = "force-dynamic";

export const alt = "مقاله — مرکز دانش حقوقی دادآور";
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
  const [article, settings] = await Promise.all([
    getArticleBySlug(slug),
    getSettings(),
  ]);

  // Categories are CMS records, so the kicker is resolved rather than mapped.
  const category = article ? await getCategoryBySlug(article.category) : null;

  return renderOgImage({
    institution: settings.institutionName,
    kicker: category?.title ?? "مرکز دانش حقوقی",
    title: article?.title ?? "مرکز دانش حقوقی",
    subtitle: article?.excerpt,
    meta: article ? formatJalali(article.publishedAt) : undefined,
  });
}
