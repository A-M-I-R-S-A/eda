import type { Metadata } from "next";
import { listArticles, listCategories } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { fa } from "@/lib/utils/persian";
import { AdminPageHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

export default async function AdminCategoriesPage() {
  await requireAdminSession("content");

  const [categories, csrfToken, articles] = await Promise.all([
    listCategories(),
    getCsrfToken(),
    listArticles({ pageSize: 1000 }),
  ]);

  /**
   * Article counts are shown per row so an administrator can see at a glance
   * why a category refuses to delete, rather than discovering it on the error.
   */
  const counts = articles.items.reduce<Record<string, number>>((acc, article) => {
    acc[article.category] = (acc[article.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="دسته‌بندی‌ها"
        description={`${fa(categories.length)} دسته‌بندی برای مقالات وب‌سایت`}
      />
      <CategoryManager
        categories={categories}
        counts={counts}
        csrfToken={csrfToken}
      />
    </div>
  );
}
