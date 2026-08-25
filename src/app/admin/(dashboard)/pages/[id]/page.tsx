import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageById } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { AdminPageHeader } from "@/components/admin/ui";
import { PageForm } from "@/components/admin/page-form";
import { PageTabs } from "@/components/admin/page-tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = await getPageById(id);
  return { title: page ? `تنظیمات ${page.title}` : "صفحه" };
}

export default async function EditPageSettings({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession("content");

  const { id } = await params;
  const [page, csrfToken] = await Promise.all([getPageById(id), getCsrfToken()]);
  if (!page) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={page.title}
        description="تنظیمات، نشانی و اطلاعات سئوی این صفحه."
        backHref={ROUTES.admin.pages}
      />
      <PageTabs page={page} />
      <PageForm page={page} csrfToken={csrfToken} />
    </div>
  );
}
