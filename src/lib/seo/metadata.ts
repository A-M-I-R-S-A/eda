import type { Metadata } from "next";

/**
 * Metadata factory.
 *
 * Every page builds its metadata here so canonical URLs, Open Graph and
 * Twitter cards stay consistent and no page silently ships without a
 * description.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://dadavar-law.ir"
).replace(/\/$/, "");

export const SITE_NAME = "مؤسسه داوری دادآور";
export const LOCALE = "fa_IR";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  /**
   * Optional explicit image. Normally omitted so the generated
   * `opengraph-image` for the route (or the nearest ancestor) is inherited.
   */
  image?: string;
  noindex?: boolean;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  noindex = false,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  keywords,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : absoluteUrl(image)
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      locale: LOCALE,
      url,
      siteName: SITE_NAME,
      title,
      description,
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] }
        : {}),
      ...(type === "article" && publishedTime
        ? { publishedTime, modifiedTime, authors }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

/**
 * Shared keyword pool; pages extend it with their own terms.
 *
 * Domestic terms only — the institution does not offer international
 * arbitration, so bidding for those queries would misdescribe it.
 */
export const BASE_KEYWORDS = [
  "داوری",
  "مؤسسه داوری",
  "داور",
  "شرط داوری",
  "میانجی‌گری",
  "مشاوره حقوقی",
  "حل اختلاف",
  "تنظیم قرارداد",
];
