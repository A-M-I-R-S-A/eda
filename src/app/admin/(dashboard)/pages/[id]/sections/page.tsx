import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageById } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { AdminPageHeader } from "@/components/admin/ui";
import { PageTabs } from "@/components/admin/page-tabs";
import { SectionEditor } from "@/components/admin/section-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = await getPageById(id);
  return { title: page ? `بخش‌های ${page.title}` : "بخش‌های صفحه" };
}

/**
 * The page builder.
 *
 * Sections are added from the library, reordered by dragging (or with the
 * keyboard), hidden, duplicated and edited — all before a single save.
 */
export default async function PageSectionsPage({
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
        description="بخش‌های این صفحه را اضافه، جابه‌جا، پنهان یا ویرایش کنید."
        backHref={ROUTES.admin.pages}
      />
      <PageTabs page={page} />
      <SectionEditor page={page} csrfToken={csrfToken} />
    </div>
  );
}
