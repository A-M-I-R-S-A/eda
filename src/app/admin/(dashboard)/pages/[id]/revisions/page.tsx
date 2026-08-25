import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageById, listRevisions } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { PageTabs } from "@/components/admin/page-tabs";
import { RevisionList } from "@/components/admin/revision-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = await getPageById(id);
  return { title: page ? `تاریخچه ${page.title}` : "تاریخچه صفحه" };
}

export default async function PageRevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession("content");

  const { id } = await params;
  const [page, csrfToken] = await Promise.all([getPageById(id), getCsrfToken()]);
  if (!page) notFound();

  const revisions = await listRevisions("page", page.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={page.title}
        description="نسخه‌های پیشین این صفحه. می‌توانید تغییرات را مقایسه کرده و هر نسخه را بازگردانید."
        backHref={ROUTES.admin.pages}
      />
      <PageTabs page={page} />

      <Panel
        title="تاریخچه نسخه‌ها"
        description="پیش از هر ذخیره‌سازی، وضعیت قبلی صفحه به‌صورت خودکار نگهداری می‌شود."
      >
        <RevisionList page={page} revisions={revisions} csrfToken={csrfToken} />
      </Panel>
    </div>
  );
}
