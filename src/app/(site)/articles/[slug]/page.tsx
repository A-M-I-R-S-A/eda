import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArticleBySlug,
  getRelatedArticles,
  getSettings,
  listArticles,
  listCategories,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { isLive } from "@/lib/cms/status";
import { buildCmsMetadata } from "@/lib/seo/cms-metadata";
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { RichText, extractHeadings } from "@/lib/content/rich-text";
import { formatJalali } from "@/lib/utils/jalali";
import { readingTimeLabel } from "@/lib/utils/persian";
import { safeStaticParams } from "@/lib/cms/build-params";
import { ArticleCard } from "@/components/cards/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { CategoryTag } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return safeStaticParams(async () => {
    const { items } = await listArticles({ publishedOnly: true, pageSize: 1000 });
    return items.map((article) => ({ slug: article.slug }));
  }, "articles");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [article, settings] = await Promise.all([
    getArticleBySlug(slug),
    getSettings(),
  ]);

  if (!article) {
    return { title: "مقاله یافت نشد", robots: { index: false, follow: false } };
  }

  return buildCmsMetadata({
    seo: article.seo,
    defaults: settings.seo,
    title: article.title,
    description: article.excerpt,
    path: ROUTES.article(article.slug),
    image: article.coverImage,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
    authors: [article.authorName],
  });
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  // Draft, archived and not-yet-due scheduled articles are 404s to the public.
  if (!article || !isLive(article)) notFound();

  const [settings, related, categories] = await Promise.all([
    getSettings(),
    getRelatedArticles(article, 3),
    listCategories({ publishedOnly: true }),
  ]);

  const category = categories.find((entry) => entry.slug === article.category) ?? {
    slug: article.category,
    title: article.category,
  };
  const headings = extractHeadings(article.body);

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd(article),
          breadcrumbJsonLd([
            { label: "مقالات", href: ROUTES.articles },
            { label: category.title, href: ROUTES.articleCategory(category.slug) },
            { label: article.title, href: ROUTES.article(article.slug) },
          ]),
        ]}
      />

      <article>
        {/* -- header ------------------------------------------------------- */}
        <header className="border-b border-line bg-paper-2/40">
          <div className="container-x py-8 lg:py-10">
            <Breadcrumbs
              items={[
                { label: "مقالات", href: ROUTES.articles },
                {
                  label: category.title,
                  href: ROUTES.articleCategory(category.slug),
                },
                { label: article.title },
              ]}
            />
          </div>

          <div className="container-x pb-12 lg:pb-14">
            <div className="max-w-3xl">
              <Link href={ROUTES.articleCategory(category.slug)}>
                <CategoryTag>{category.title}</CategoryTag>
              </Link>

              <h1 className="display-2 mt-6">{article.title}</h1>

              <p className="lead mt-6">{article.excerpt}</p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.8125rem] text-muted">
                <span className="flex items-center gap-2">
                  <Icon name="user" size={15} className="text-gold-600" />
                  {article.authorName}
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="calendar" size={15} className="text-gold-600" />
                  <time dateTime={article.publishedAt}>
                    {formatJalali(article.publishedAt)}
                  </time>
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="clock" size={15} className="text-gold-600" />
                  {readingTimeLabel(article.readingMinutes)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* -- cover -------------------------------------------------------- */}
        <div className="container-x">
          <div className="relative -mt-px aspect-[16/9] overflow-hidden bg-navy-900 md:aspect-[21/9]">
            <Image
              src={article.coverImage}
              alt=""
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1320px"
              className="object-cover"
            />
          </div>
        </div>

        {/* -- body --------------------------------------------------------- */}
        <div className="section">
          <div className="container-x">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-8">
                <RichText source={article.body} />

                {article.tags.length > 0 && (
                  <div className="mt-14 flex flex-wrap items-center gap-2 border-t border-line pt-8">
                    <span className="text-[0.8125rem] font-semibold text-muted">
                      برچسب‌ها:
                    </span>
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-xs bg-paper-2 px-2.5 py-1.5 text-[0.75rem] text-ink-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <aside className="surface mt-10 flex items-start gap-3 p-5">
                  <Icon name="info" size={18} className="mt-0.5 shrink-0 text-gold-600" />
                  <p className="text-[0.8125rem] leading-[2] text-muted">
                    این نوشته جنبه اطلاع‌رسانی عمومی دارد و جایگزین مشاوره حقوقی
                    متناسب با شرایط پرونده شما نیست. برای بررسی موضوع خود،{" "}
                    <Link
                      href={ROUTES.contact}
                      className="font-medium text-navy-800 underline underline-offset-4 decoration-gold-300 hover:decoration-gold-500"
                    >
                      با مؤسسه تماس بگیرید
                    </Link>
                    .
                  </p>
                </aside>
              </div>

              {/* -- sidebar ------------------------------------------------ */}
              <aside className="lg:col-span-4">
                <div className="sticky top-28 flex flex-col gap-6">
                  {headings.length > 1 && (
                    <nav aria-label="فهرست مطالب" className="surface p-6">
                      <h2 className="text-[0.8125rem] font-semibold text-muted">
                        در این مطلب می‌خوانید
                      </h2>
                      <ol className="mt-4 flex flex-col gap-2.5">
                        {headings.map((heading) => (
                          <li key={heading.id}>
                            <a
                              href={`#${heading.id}`}
                              className={
                                heading.level === 3
                                  ? "block ps-4 text-[0.8125rem] leading-[1.9] text-muted transition-colors hover:text-navy-800"
                                  : "block text-[0.875rem] leading-[1.9] text-ink-2 transition-colors hover:text-navy-900"
                              }
                            >
                              {heading.text}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  )}

                  <div className="on-navy relative overflow-hidden p-6">
                    <div
                      aria-hidden="true"
                      className="grid-lines pointer-events-none absolute inset-0"
                    />
                    <div className="relative">
                      <h2 className="text-[1.0625rem] font-bold text-white">
                        درباره پرونده خود سؤال دارید؟
                      </h2>
                      <p className="mt-3 text-[0.875rem] leading-[2] text-white/60">
                        در یک جلسه مشاوره، مسیر حقوقی موضوع و گزینه‌های پیش رو
                        روشن می‌شود.
                      </p>
                      <ButtonLink
                        href={ROUTES.appointment}
                        variant="accent"
                        size="md"
                        block
                        className="mt-6"
                      >
                        رزرو وقت مشاوره
                      </ButtonLink>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </article>

      {/* -- related --------------------------------------------------------- */}
      {related.length > 0 && (
        <section className="section-sm border-t border-line bg-paper-2/40">
          <div className="container-x">
            <h2 className="text-[1.25rem] font-bold text-navy-900">
              مطالب مرتبط
            </h2>
            <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ArticleCard
                  key={item.id}
                  article={item}
                  categoryTitle={
                    categories.find((entry) => entry.slug === item.category)?.title
                  }
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand phone={settings.phones[0]} />
    </>
  );
}
