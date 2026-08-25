import type { Metadata } from "next";
import { getPageBySlug, getSettings } from "@/lib/db";
import { buildSectionContext } from "@/lib/cms/page-context";
import { buildCmsMetadata } from "@/lib/seo/cms-metadata";
import { ROUTES } from "@/lib/config/routes";
import { SectionRenderer } from "@/components/sections/renderer";
import { EmptyState } from "@/components/ui/states";

/**
 * Homepage.
 *
 * Nothing about what appears here is decided in this file. The page record
 * with the reserved empty slug supplies the section list, and an administrator
 * can reorder, hide, duplicate or replace any of it from
 * `/admin/pages` — including removing the hero entirely.
 */

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPageBySlug(""), getSettings()]);

  return buildCmsMetadata({
    seo: page?.seo,
    defaults: settings.seo,
    // The root layout appends the institution name, so naming it here too
    // would print it twice in the tab and in the SERP.
    title: page?.seo.metaTitle || settings.seo.defaultTitle,
    description: page?.excerpt || settings.description,
    path: ROUTES.home,
    image: page?.featuredImage,
  });
}

export default async function HomePage() {
  const page = await getPageBySlug("");

  /**
   * The home page record is seeded and cannot be deleted from the admin, so
   * this only happens on a store that failed to seed. Saying so plainly beats
   * a blank screen or a crash.
   */
  if (!page) {
    return (
      <EmptyState
        icon="layers"
        title="صفحه اصلی هنوز پیکربندی نشده است"
        description="برای ساخت محتوای صفحه اصلی، از بخش «صفحات» در پنل مدیریت اقدام کنید."
        action={{ label: "ورود به پنل مدیریت", href: ROUTES.admin.root }}
        className="min-h-[60vh]"
      />
    );
  }

  const context = await buildSectionContext(page.sections);

  return <SectionRenderer sections={page.sections} context={context} />;
}
