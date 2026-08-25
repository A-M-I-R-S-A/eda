import type { Metadata } from "next";
import type { SeoFields, SeoSettings } from "@/types";
import { absoluteUrl } from "./metadata";

/**
 * Metadata built from CMS records.
 *
 * Every field cascades: the entity's own value wins, then the global default,
 * then the entity's plain title or excerpt. The result is that an
 * administrator can leave the whole SEO panel empty and still ship a page with
 * a sensible title, description and social card — filling it in is an
 * improvement, not a prerequisite.
 */

export interface CmsMetaInput {
  /** The entity's own SEO block. */
  seo?: Partial<SeoFields>;
  /** Site-wide defaults. */
  defaults: SeoSettings;
  /** Fallback title when `seo.metaTitle` is empty. */
  title: string;
  /** Fallback description when `seo.metaDescription` is empty. */
  description?: string;
  /** Canonical path when `seo.canonicalPath` is empty. */
  path: string;
  /** Fallback social image. */
  image?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}

export function buildCmsMetadata({
  seo,
  defaults,
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
}: CmsMetaInput): Metadata {
  const metaTitle = seo?.metaTitle?.trim() || title;
  const metaDescription =
    seo?.metaDescription?.trim() || description?.trim() || defaults.defaultDescription;

  const canonical = seo?.canonicalPath?.trim() || path;
  const url = canonical.startsWith("http") ? canonical : absoluteUrl(canonical);

  const socialImage =
    seo?.ogImage?.trim() || image?.trim() || defaults.defaultOgImage?.trim();
  const ogImage = socialImage
    ? socialImage.startsWith("http")
      ? socialImage
      : absoluteUrl(socialImage)
    : undefined;

  /**
   * A page can only be *less* indexable than the site, never more. Turning
   * indexing off globally is a deliberate act (a staging deployment, a site
   * not ready to launch) and one page's setting must not quietly undo it.
   */
  const index = defaults.indexSite && !seo?.noindex;
  const follow = defaults.followLinks && !seo?.nofollow;

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: defaults.keywords.length ? defaults.keywords : undefined,
    alternates: { canonical: url },
    robots: {
      index,
      follow,
      ...(index
        ? {
            googleBot: {
              index: true,
              follow,
              "max-image-preview": "large",
              "max-snippet": -1,
              "max-video-preview": -1,
            },
          }
        : { nocache: true }),
    },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      locale: "fa_IR",
      url,
      siteName: defaults.defaultTitle,
      title: seo?.ogTitle?.trim() || metaTitle,
      description: seo?.ogDescription?.trim() || metaDescription,
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630, alt: metaTitle }] }
        : {}),
      ...(type === "article" && publishedTime
        ? { publishedTime, modifiedTime, authors }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: defaults.twitterHandle || undefined,
      title: seo?.ogTitle?.trim() || metaTitle,
      description: seo?.ogDescription?.trim() || metaDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

/**
 * The `%s` template an administrator controls, applied to a page title.
 *
 * The root layout owns the real `title.template`, so this is only used where
 * a complete string is needed — an Open Graph title, a JSON-LD name.
 */
export function applyTitleTemplate(
  title: string,
  defaults: SeoSettings,
): string {
  if (!defaults.titleTemplate.includes("%s")) return title;
  return defaults.titleTemplate.replace("%s", title);
}
