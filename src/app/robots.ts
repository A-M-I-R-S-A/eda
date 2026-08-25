import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/db";
import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Regenerated per request: the indexing switch lives in the CMS, so a robots
 * file frozen at build time would keep advertising the old answer after an
 * administrator changed it.
 */
export const dynamic = "force-dynamic";

/**
 * `robots.txt`, generated from the SEO settings.
 *
 * Turning indexing off in the admin produces a real site-wide `Disallow: /`
 * rather than only a meta tag, which is what a staging deployment needs.
 * Administrators can add their own directives, and they are appended verbatim
 * after the generated block.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const { seo } = settings;

  if (!seo.indexSite) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          // Tracking results are keyed to a private code + phone number.
          "/tracking?",
        ],
      },
    ],
    ...(seo.sitemapEnabled ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
    host: SITE_URL,
  };
}
