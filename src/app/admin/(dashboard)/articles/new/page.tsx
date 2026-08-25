import type { Metadata } from "next";
import { listCategories } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { ArticleForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "مقاله جدید" };

export default async function NewArticlePage() {
  await requireAdminSession("content");

  const [csrfToken, categories] = await Promise.all([
    getCsrfToken(),
    listCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.articles}
        title="نگارش مقاله جدید"
        description="زمان مطالعه به‌صورت خودکار از روی متن محاسبه می‌شود."
      />
      <ArticleForm csrfToken={csrfToken} categories={categories} />
    </div>
  );
}
