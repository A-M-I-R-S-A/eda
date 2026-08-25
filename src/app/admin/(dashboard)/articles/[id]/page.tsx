import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleById, listCategories } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { CONTENT_STATUS } from "@/lib/config/labels";
import { isLive } from "@/lib/cms/status";
import { ArticleForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "ویرایش مقاله" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: PageProps) {
  await requireAdminSession("content");

  const { id } = await params;
  const [article, csrfToken, categories] = await Promise.all([
    getArticleById(id),
    getCsrfToken(),
    listCategories(),
  ]);

  if (!article) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.articles}
        title={`ویرایش: ${article.title}`}
        description={CONTENT_STATUS[article.status].description}
        actions={
          <>
            <Link
              href={ROUTES.admin.articleRevisions(article.id)}
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-line-2 px-3.5 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
            >
              <Icon name="history" size={15} />
              تاریخچه
            </Link>
            {isLive(article) && (
              <ButtonLink
                href={ROUTES.article(article.slug)}
                variant="outline"
                size="sm"
                icon="external"
                target="_blank"
              >
                مشاهده در وب‌سایت
              </ButtonLink>
            )}
          </>
        }
      />
      <ArticleForm
        csrfToken={csrfToken}
        article={article}
        categories={categories}
      />
    </div>
  );
}
