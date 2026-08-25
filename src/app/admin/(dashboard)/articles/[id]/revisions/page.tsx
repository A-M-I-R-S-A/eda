import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleById, listRevisions } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { restoreArticleRevisionAction } from "@/lib/actions/revisions";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import {
  ARTICLE_REVISION_FIELDS,
  EntityRevisions,
} from "@/components/admin/entity-revisions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleById(id);
  return { title: article ? `تاریخچه ${article.title}` : "تاریخچه مقاله" };
}

export default async function ArticleRevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession("content");

  const { id } = await params;
  const [article, csrfToken] = await Promise.all([
    getArticleById(id),
    getCsrfToken(),
  ]);
  if (!article) notFound();

  const revisions = await listRevisions("article", article.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.articleEdit(article.id)}
        title={`تاریخچه: ${article.title}`}
        description="نسخه‌های پیشین این مقاله. می‌توانید تغییرات را مقایسه کرده و هر نسخه را بازگردانید."
      />

      <Panel
        title="تاریخچه نسخه‌ها"
        description="پیش از هر ذخیره‌سازی، وضعیت قبلی مقاله به‌صورت خودکار نگهداری می‌شود."
      >
        <EntityRevisions
          current={article as unknown as Record<string, unknown>}
          revisions={revisions}
          fields={ARTICLE_REVISION_FIELDS}
          action={restoreArticleRevisionAction}
          csrfToken={csrfToken}
        />
      </Panel>
    </div>
  );
}
