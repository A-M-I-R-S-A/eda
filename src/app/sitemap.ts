import type { MetadataRoute } from "next";
import {
  getSettings,
  listAdditionalArbitrators,
  listArticles,
  listCategories,
  listPages,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { absoluteUrl } from "@/lib/seo/metadata";

/**
 * Regenerated per request, not frozen at build.
 *
 * Two reasons. Content is authored in the CMS *after* a deploy, so a sitemap
 * baked at build time starts going stale the first time somebody publishes an
 * article. And prerendering it makes `next build` depend on the production
 * database being reachable — which on a host that builds and runs in separate
 * steps turns a routine deploy into a connection error.
 */
export const dynamic = "force-dynamic";

/**
 * XML sitemap.
 *
 * Built entirely from what the CMS currently publishes: pages an administrator
 * created, categories and articles. A page marked `noindex` is
 * left out — listing a URL we have asked crawlers to ignore is a contradiction
 * search engines report as an error.
 *
 * The whole sitemap can also be switched off from the SEO settings screen, for
 * a staging deployment that should not be discoverable at all.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();

  if (!settings.seo.sitemapEnabled || !settings.seo.indexSite) return [];

  const [pages, additionalArbitrators, categories, articles] =
    await Promise.all([
      listPages({ liveOnly: true }),
      // The principal arbitrator is the static `/arbitrator` route; only any
      // *further* arbitrators need their own slug entries.
      listAdditionalArbitrators(),
      listCategories({ publishedOnly: true }),
      listArticles({ publishedOnly: true, pageSize: 1000 }),
    ]);

  const now = new Date();

  const indexable = pages.filter((page) => !page.seo.noindex);

  return [
    ...indexable.map((page) => ({
      url: absoluteUrl(page.slug ? `/${page.slug}` : "/"),
      lastModified: new Date(page.updatedAt),
      changeFrequency: (page.slug ? "monthly" : "weekly") as
        | "monthly"
        | "weekly",
      // The home page outranks everything; navigation pages come next.
      priority: page.slug ? (page.showInNav ? 0.8 : 0.5) : 1,
    })),

    ...additionalArbitrators.map((arbitrator) => ({
      url: absoluteUrl(ROUTES.arbitratorProfile(arbitrator.slug)),
      lastModified: new Date(arbitrator.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    ...categories.map((category) => ({
      url: absoluteUrl(ROUTES.articleCategory(category.slug)),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),

    ...articles.items
      .filter((article) => !article.seo.noindex)
      .map((article) => ({
        url: absoluteUrl(ROUTES.article(article.slug)),
        lastModified: new Date(article.updatedAt),
        changeFrequency: "yearly" as const,
        priority: article.featured ? 0.8 : 0.7,
      })),
  ];
}
