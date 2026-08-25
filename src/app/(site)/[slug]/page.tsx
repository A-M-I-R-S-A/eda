import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug, getSettings, listPages } from "@/lib/db";
import { isLive } from "@/lib/cms/status";
import { buildSectionContext } from "@/lib/cms/page-context";
import { buildCmsMetadata } from "@/lib/seo/cms-metadata";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { RESERVED_SLUGS } from "@/lib/config/routes";
import { safeStaticParams } from "@/lib/cms/build-params";
import { SectionRenderer } from "@/components/sections/renderer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

/**
 * CMS-authored pages.
 *
 * Any page an administrator creates renders here from its section list. Routes
 * that need behaviour sections cannot express — a booking wizard, a filtered
 * archive — keep their own files, which take precedence over this catch-all;
 * their slugs are listed in `RESERVED_SLUGS` so the CMS refuses to create a
 * page that would be permanently shadowed by one.
 */

export const revalidate = 300;

/**
 * Pre-renders the pages that exist at build time.
 *
 * `dynamicParams` stays on so a page created after the build still resolves —
 * it renders on first request and is cached from then on.
 */
export async function generateStaticParams() {
  return safeStaticParams(async () => {
    const pages = await listPages({ liveOnly: true });
    return pages
      .filter((page) => page.slug && !RESERVED_SLUGS.includes(page.slug))
      .map((page) => ({ slug: page.slug }));
  }, "pages");
}

async function loadPage(slug: string) {
  const page = await getPageBySlug(slug);
  // An unpublished, scheduled-for-later or archived page is a 404 to the
  // public, exactly like one that does not exist.
  if (!page || !isLive(page)) return null;
  return page;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [page, settings] = await Promise.all([loadPage(slug), getSettings()]);

  if (!page) return { title: "صفحه یافت نشد", robots: { index: false } };

  return buildCmsMetadata({
    seo: page.seo,
    defaults: settings.seo,
    title: page.title,
    description: page.excerpt,
    path: `/${page.slug}`,
    image: page.featuredImage,
  });
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  const context = await buildSectionContext(page.sections);

  /**
   * A page whose first section is a hero already states its own title, so
   * repeating it as a breadcrumb heading would be redundant. Pages that start
   * with body content get the breadcrumb trail instead.
   */
  const leadsWithHero = page.sections.find((s) => s.visible)?.type === "hero";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ label: page.title, href: `/${page.slug}` }])}
      />

      {!leadsWithHero && (
        <div className="border-b border-line bg-paper-2/40">
          <div className="container-x py-6">
            <Breadcrumbs items={[{ label: page.title }]} />
          </div>
        </div>
      )}

      <SectionRenderer sections={page.sections} context={context} />
    </>
  );
}
