import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/types";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { formatJalali } from "@/lib/utils/jalali";
import { readingTimeLabel } from "@/lib/utils/persian";
import { CategoryTag } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

/**
 * Article card.
 *
 * Cover images are lazy by default; pass `priority` for the first card above
 * the fold so the LCP image is not deferred.
 */
export function ArticleCard({
  article,
  /**
   * Resolved category name.
   *
   * Categories are CMS records, so the label is looked up by whichever server
   * component already holds the category list rather than re-derived here.
   * Falling back to the slug keeps a card readable if its category was deleted.
   */
  categoryTitle,
  priority = false,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px",
}: {
  article: Article;
  categoryTitle?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const category = { slug: article.category, title: categoryTitle ?? article.category };

  return (
    <article className={cn("group flex flex-col bg-white", className)}>
      <Link
        href={ROUTES.article(article.slug)}
        className="flex flex-1 flex-col outline-offset-4"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-navy-900">
          <Image
            src={article.coverImage}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.035]"
          />
          <span className="absolute bottom-3 start-3">
            <CategoryTag tone="dark">{category.title}</CategoryTag>
          </span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-[1.0625rem] font-bold leading-[1.75] text-navy-900 transition-colors duration-300 group-hover:text-navy-700">
            {article.title}
          </h3>

          <p className="mt-3 line-clamp-3 flex-1 text-[0.875rem] leading-[2] text-muted">
            {article.excerpt}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[0.75rem] text-muted-2">
            <time dateTime={article.publishedAt}>
              {formatJalali(article.publishedAt)}
            </time>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={13} />
              {readingTimeLabel(article.readingMinutes)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Wide, editorial variant used for the featured article. */
export function ArticleCardFeatured({
  article,
  categoryTitle,
}: {
  article: Article;
  categoryTitle?: string;
}) {
  const category = { title: categoryTitle ?? article.category };

  return (
    <article className="group grid overflow-hidden border border-line bg-white md:grid-cols-2">
      <Link
        href={ROUTES.article(article.slug)}
        className="relative aspect-[16/10] overflow-hidden bg-navy-900 md:aspect-auto md:min-h-[21rem]"
      >
        <Image
          src={article.coverImage}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-col justify-center p-7 lg:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryTag>{category.title}</CategoryTag>
          <span className="text-[0.75rem] text-muted-2">
            {formatJalali(article.publishedAt)}
          </span>
        </div>

        <h3 className="mt-5 text-[1.375rem] font-bold leading-[1.65] text-navy-900 lg:text-[1.625rem]">
          <Link
            href={ROUTES.article(article.slug)}
            className="transition-colors duration-300 hover:text-navy-700"
          >
            {article.title}
          </Link>
        </h3>

        <p className="mt-4 line-clamp-4 text-[0.9375rem] leading-[2.1] text-muted">
          {article.excerpt}
        </p>

        <div className="mt-7 flex items-center justify-between">
          <Link
            href={ROUTES.article(article.slug)}
            className="link-underline group/link text-[0.9375rem] font-semibold text-navy-800"
          >
            <span>ادامه مطلب</span>
            <Icon
              name="arrow-forward"
              size={16}
              className="text-gold-600 transition-transform duration-400 group-hover/link:-translate-x-1"
            />
          </Link>

          <span className="flex items-center gap-1.5 text-[0.75rem] text-muted-2">
            <Icon name="clock" size={13} />
            {readingTimeLabel(article.readingMinutes)}
          </span>
        </div>
      </div>
    </article>
  );
}

/** Text-only row used in "related articles" and sidebar lists. */
export function ArticleRow({ article }: { article: Article }) {
  return (
    <Link
      href={ROUTES.article(article.slug)}
      className="group flex items-start gap-4 border-b border-line py-4 last:border-0"
    >
      <div className="relative size-16 shrink-0 overflow-hidden bg-navy-900">
        <Image
          src={article.coverImage}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-[0.875rem] font-semibold leading-[1.85] text-navy-900 transition-colors group-hover:text-navy-600">
          {article.title}
        </h4>
        <p className="mt-1 text-[0.75rem] text-muted-2">
          {formatJalali(article.publishedAt)}
        </p>
      </div>
    </Link>
  );
}
