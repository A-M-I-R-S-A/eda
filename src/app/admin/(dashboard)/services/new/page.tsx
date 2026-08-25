import type { Metadata } from "next";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { ServiceForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "افزودن خدمت" };

export default async function NewServicePage() {
  const csrfToken = await getCsrfToken();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.services}
        title="افزودن خدمت جدید"
        description="خدمت پس از ذخیره در فهرست خدمات وب‌سایت نمایش داده می‌شود."
      />
      <ServiceForm csrfToken={csrfToken} />
    </div>
  );
}
