import type { Metadata } from "next";
import { getSettings, listArticles, listCategories } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { buildSectionContext } from "@/lib/cms/page-context";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { fa } from "@/lib/utils/persian";
import { PageHero } from "@/components/layout/page-hero";
import { ArticleFilterBar } from "@/components/articles/filter-bar";
import {
  ArticleCard,
  ArticleCardFeatured,
} from "@/components/cards/article-card";
import { SectionRenderer } from "@/components/sections/renderer";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";

/**
 * Article archive.
 *
 * A hand-built route because it filters, searches and paginates. Its heading,
 * lead and SEO come from the `articles` system page, and its categories come
 * from the CMS category list — neither is declared here.
 */

const PAGE_SIZE = 9;

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { category, q, page } = await searchParams;
  const categories = await listCategories({ publishedOnly: true });
  const known = categories.find((entry) => entry.slug === category);

  const base = await systemPageMetadata("articles", {
    title: "مرکز دانش حقوقی",
    description:
      "تحلیل‌ها و یادداشت‌های تخصصی درباره داوری، حقوق تجارت، قراردادها و حل اختلاف.",
    path: ROUTES.articles,
  });

  // Search results and deep pages carry no unique value for the index.
  const thin = Boolean(q) || Number(page ?? 1) > 1;

  if (!known && !thin) return base;

  return {
    ...base,
    ...(known
      ? {
          title: `${known.title} — ${base.title}`,
          description: known.description || base.description,
          alternates: { canonical: ROUTES.articleCategory(known.slug) },
        }
      : {}),
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ArticlesPage({ searchParams }: PageProps) {
  const { category, q, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const categories = await listCategories({ publishedOnly: true });
  const active = categories.find((entry) => entry.slug === category);
  const validCategory = active?.slug ?? "all";

  const [settings, result, copy] = await Promise.all([
    getSettings(),
    listArticles({
      publishedOnly: true,
      category: validCategory,
      search: q,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    getSystemPage("articles", {
      eyebrow: "مرکز دانش حقوقی",
      heading: "تحلیل‌ها و یادداشت‌های تخصصی",
      lead: "نوشته‌هایی درباره داوری، قراردادها و حل اختلاف.",
    }),
  ]);

  const extraContext = await buildSectionContext(copy.extraSections);

  const categoryTitle = (slug: string) =>
    categories.find((entry) => entry.slug === slug)?.title ?? slug;

  const isFiltered = validCategory !== "all" || Boolean(q);
  const showFeatured = !isFiltered && currentPage === 1 && result.items.length > 0;
  const [featured, ...rest] = result.items;
  const grid = showFeatured ? rest : result.items;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (validCategory !== "all") params.set("category", validCategory);
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.articles}?${query}` : ROUTES.articles;
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { label: "مقالات", href: ROUTES.articles },
            ...(active
              ? [
                  {
                    label: active.title,
                    href: ROUTES.articleCategory(active.slug),
                  },
                ]
              : []),
          ]),
          itemListJsonLd(
            `مقالات ${settings.institutionName}`,
            result.items.map((a) => ({
              name: a.title,
              href: ROUTES.article(a.slug),
            })),
          ),
        ]}
      />

      <PageHero
        eyebrow={copy.eyebrow}
        breadcrumbs={[
          { label: "مقالات", href: active ? ROUTES.articles : undefined },
          ...(active ? [{ label: active.title }] : []),
        ]}
        title={active ? active.title : copy.heading}
        lead={active ? active.description || copy.lead : copy.lead}
      />

      <section className="section">
        <div className="container-x">
          <ArticleFilterBar
            categories={categories}
            activeCategory={validCategory}
            search={q ?? ""}
          />

          {result.total === 0 ? (
            <EmptyState
              className="mt-10 border border-line bg-white"
              icon="search"
              title="مطلبی با این مشخصات پیدا نشد"
              description={
                q
                  ? `جست‌وجوی «${q}» نتیجه‌ای نداشت. عبارت دیگری را امتحان کنید یا فیلتر دسته‌بندی را بردارید.`
                  : "در این دسته‌بندی هنوز مطلبی منتشر نشده است."
              }
              action={{ label: "مشاهده همه مقالات", href: ROUTES.articles }}
            />
          ) : (
            <>
              <p className="mt-6 text-[0.875rem] text-muted">
                {q ? (
                  <>
                    <span className="tabular-nums">{fa(result.total)}</span> نتیجه
                    برای «{q}»
                  </>
                ) : (
                  <>
                    <span className="tabular-nums">{fa(result.total)}</span> مطلب در
                    این بخش
                  </>
                )}
              </p>

              {showFeatured && featured && (
                <div className="mt-8">
                  <ArticleCardFeatured
                    article={featured}
                    categoryTitle={categoryTitle(featured.category)}
                  />
                </div>
              )}

              {grid.length > 0 && (
                <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                  {grid.map((article, index) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      categoryTitle={categoryTitle(article.category)}
                      priority={!showFeatured && index < 3}
                    />
                  ))}
                </div>
              )}

              <Pagination
                className="mt-12"
                page={result.page}
                totalPages={result.totalPages}
                hrefFor={hrefFor}
              />
            </>
          )}
        </div>
      </section>

      <SectionRenderer
        sections={copy.extraSections}
        context={extraContext}
      />
    </>
  );
}
