import "server-only";

import type { PageSection, SectionType } from "@/types";
import {
  getSettings,
  listArbitrators,
  listArticles,
  listCategories,
  listFaqs,
  listServices,
  listTestimonials,
} from "@/lib/db";
import { getCsrfToken } from "@/lib/security/csrf";
import type { SectionContext } from "@/components/sections/renderer";

/**
 * Builds the data a page's sections need.
 *
 * Collection sections do not query anything themselves. If six sections each
 * fetched their own list, a single page would issue six rounds of reads for
 * data that is largely the same; instead the page inspects which section types
 * it actually contains and fetches only those collections, once, in parallel.
 */

const NEEDS: Partial<Record<SectionType, keyof Loaded>> = {
  services: "services",
  articles: "articles",
  faq: "faqs",
  team: "team",
  testimonials: "testimonials",
};

interface Loaded {
  services: SectionContext["services"];
  articles: SectionContext["articles"];
  faqs: SectionContext["faqs"];
  team: SectionContext["team"];
  testimonials: SectionContext["testimonials"];
}

export async function buildSectionContext(
  sections: PageSection[],
  options: { includeAll?: boolean } = {},
): Promise<SectionContext> {
  const types = new Set(sections.map((section) => section.type));
  const needs = (key: keyof Loaded) =>
    options.includeAll ||
    [...types].some((type) => NEEDS[type] === key);

  // The contact section renders a form, which needs a CSRF token; asking for
  // one on every page would set a cookie no other page uses.
  const wantsForm = options.includeAll || types.has("contact");

  const [
    settings,
    categories,
    services,
    articles,
    faqs,
    team,
    testimonials,
    csrfToken,
  ] = await Promise.all([
    getSettings(),
    listCategories({ publishedOnly: true }),
    needs("services") ? listServices({ publishedOnly: true }) : [],
    needs("articles")
      ? listArticles({ publishedOnly: true, pageSize: 12 }).then((r) => r.items)
      : [],
    needs("faqs") ? listFaqs({ publishedOnly: true }) : [],
    needs("team") ? listArbitrators({ publishedOnly: true }) : [],
    needs("testimonials") ? listTestimonials({ publishedOnly: true }) : [],
    wantsForm ? getCsrfToken() : "",
  ]);

  return {
    settings,
    categories,
    services,
    articles,
    faqs,
    team,
    testimonials,
    csrfToken,
  };
}
