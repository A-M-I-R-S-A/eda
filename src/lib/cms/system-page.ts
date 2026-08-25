import "server-only";

import type { Metadata } from "next";
import type { Page, PageSection, SeoSettings } from "@/types";
import { getPageBySlug, getSettings } from "@/lib/db";
import { str } from "./section-data";
import { buildCmsMetadata } from "@/lib/seo/cms-metadata";

/**
 * Copy and SEO for a hand-built route.
 *
 * `/articles`, `/contact`, `/appointment` and friends keep their own files
 * because they do something sections cannot — filter an archive, run a booking
 * wizard, look up a tracking code. Their *words* should still be editable, so
 * each has a `system: true` page record supplying the heading, lead and SEO,
 * plus any extra sections an administrator adds below the functional block.
 *
 * When the record is missing (a store that failed to seed) the supplied
 * fallbacks are used, so a route never renders with an empty `<h1>`.
 */

export interface SystemPageCopy {
  page: Page | null;
  eyebrow: string;
  heading: string;
  lead: string;
  /** Sections after the hero, rendered below the route's own content. */
  extraSections: PageSection[];
  seoDefaults: SeoSettings;
}

export async function getSystemPage(
  slug: string,
  fallback: { eyebrow: string; heading: string; lead: string },
): Promise<SystemPageCopy> {
  const [page, settings] = await Promise.all([getPageBySlug(slug), getSettings()]);

  const sections = [...(page?.sections ?? [])].sort((a, b) => a.order - b.order);
  const hero = sections.find((section) => section.type === "hero");

  return {
    page,
    eyebrow: hero ? str(hero.data, "eyebrow", fallback.eyebrow) : fallback.eyebrow,
    heading: hero
      ? str(hero.data, "heading", fallback.heading)
      : (page?.title ?? fallback.heading),
    lead: hero
      ? str(hero.data, "description", fallback.lead)
      : (page?.excerpt ?? fallback.lead),
    // The hero is rendered by the route's own `PageHero`; anything else the
    // administrator added goes below the functional content.
    extraSections: sections.filter(
      (section) => section.id !== hero?.id && section.visible,
    ),
    seoDefaults: settings.seo,
  };
}

/** Metadata for a hand-built route, driven by its page record. */
export async function systemPageMetadata(
  slug: string,
  fallback: { title: string; description: string; path: string },
): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPageBySlug(slug), getSettings()]);

  return buildCmsMetadata({
    seo: page?.seo,
    defaults: settings.seo,
    title: page?.seo.metaTitle || page?.title || fallback.title,
    description: page?.excerpt || fallback.description,
    path: fallback.path,
    image: page?.featuredImage,
  });
}
