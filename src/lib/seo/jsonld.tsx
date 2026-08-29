import type { Arbitrator, Article, FaqItem, SiteSettings } from "@/types";
import { toPlainText } from "@/lib/content/rich-text";
import { ROUTES } from "@/lib/config/routes";
import { SITE_NAME, SITE_URL, absoluteUrl } from "./metadata";

/**
 * Schema.org structured data.
 *
 * Emitted as `application/ld+json`. The CSP allows inline scripts, but this
 * payload is JSON serialised by `JSON.stringify` with `<` escaped, so content
 * can never break out of the script element.
 */

type Json = Record<string, unknown>;

/** Renders a JSON-LD block safely. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // Serialised JSON only, with `<` escaped above — no user markup path.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Core entities                                                             */
/* -------------------------------------------------------------------------- */

export function organizationJsonLd(settings: SiteSettings): Json {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LegalService"],
    "@id": `${SITE_URL}/#organization`,
    name: settings.institutionName,
    alternateName: settings.institutionShortName,
    url: SITE_URL,
    description: settings.description,
    slogan: settings.tagline,
    email: settings.email,
    telephone: settings.phones[0],
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon.svg"),
    },
    image: absoluteUrl("/og-default.svg"),
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      postalCode: settings.postalCode,
      addressLocality: "تهران",
      addressCountry: "IR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: settings.mapLat,
      longitude: settings.mapLng,
    },
    areaServed: { "@type": "Country", name: "ایران" },
    availableLanguage: ["fa"],
    sameAs: settings.socials.map((s) => s.url),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Saturday",
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
        ],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Thursday"],
        opens: "09:00",
        closes: "13:00",
      },
    ],
    knowsAbout: [
      "داوری",
      "رسیدگی به اختلافات",
      "میانجی‌گری",
      "مشاوره حقوقی",
      "تنظیم و بررسی قراردادها",
    ],
  };
}

export function websiteJsonLd(settings: SiteSettings): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: settings.institutionName,
    description: settings.description,
    inLanguage: "fa-IR",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/articles?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function personJsonLd(
  arbitrator: Arbitrator,
  { isPrincipal = true }: { isPrincipal?: boolean } = {},
): Json {
  const url = absoluteUrl(
    isPrincipal ? ROUTES.arbitrator : ROUTES.arbitratorProfile(arbitrator.slug),
  );

  const optional = (key: string, value: unknown[] | string | undefined) =>
    value && value.length ? { [key]: value } : {};

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: arbitrator.fullName,
    jobTitle: arbitrator.title,
    url,
    worksFor: { "@id": `${SITE_URL}/#organization` },
    image: arbitrator.photoUrl ? absoluteUrl(arbitrator.photoUrl) : undefined,
    email: arbitrator.email,
    ...optional("description", arbitrator.shortBio.trim()),
    ...optional("knowsLanguage", arbitrator.languages),
    ...optional("knowsAbout", [...arbitrator.expertise, ...arbitrator.practiceAreas]),
    ...optional(
      "alumniOf",
      arbitrator.education.map((entry) => ({
        "@type": "EducationalOrganization",
        name: entry.institution,
      })),
    ),
    ...optional(
      "memberOf",
      arbitrator.memberships.map((name) => ({
        "@type": "Organization",
        name,
      })),
    ),
  };
}

export function articleJsonLd(article: Article): Json {
  const url = absoluteUrl(ROUTES.article(article.slug));

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: [absoluteUrl(article.coverImage)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "fa-IR",
    wordCount: toPlainText(article.body).split(/\s+/).length,
    keywords: article.tags.join("، "),
    articleSection: article.category,
    author: {
      "@type": "Person",
      name: article.authorName,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function faqJsonLd(items: FaqItem[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": absoluteUrl(ROUTES.faq) + "#faq",
    inLanguage: "fa-IR",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: { label: string; href: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { label: "صفحه اصلی", href: ROUTES.home },
      ...items,
    ].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
}

export function itemListJsonLd(
  name: string,
  items: { name: string; href: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.href),
    })),
  };
}

export function contactPageJsonLd(settings: SiteSettings): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": absoluteUrl(ROUTES.contact) + "#contact",
    name: `تماس با ${SITE_NAME}`,
    inLanguage: "fa-IR",
    mainEntity: { "@id": `${SITE_URL}/#organization` },
    about: {
      "@type": "Organization",
      name: settings.institutionName,
      telephone: settings.phones[0],
      email: settings.email,
    },
  };
}
