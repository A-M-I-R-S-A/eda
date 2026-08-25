import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { AdminPageHeader } from "@/components/admin/ui";
import { PageForm } from "@/components/admin/page-form";

export const metadata: Metadata = { title: "صفحه جدید" };

export default async function NewPagePage() {
  await requireAdminSession("content");
  const csrfToken = await getCsrfToken();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="ساخت صفحه جدید"
        description="ابتدا عنوان و نشانی صفحه را مشخص کنید. پس از ذخیره، به ویرایشگر بخش‌ها هدایت می‌شوید."
        backHref={ROUTES.admin.pages}
      />
      <PageForm csrfToken={csrfToken} />
    </div>
  );
}
