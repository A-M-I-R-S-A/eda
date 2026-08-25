import type { Metadata } from "next";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { ArbitratorForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "افزودن داور" };

export default async function NewArbitratorPage() {
  const csrfToken = await getCsrfToken();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.arbitrators}
        title="افزودن داور جدید"
        description="مؤسسه یک داور دارد. افزودن پروفایل دوم، صفحه‌ای جداگانه در نشانی /arbitrator/<slug> ایجاد می‌کند و صفحه «درباره داور» همچنان به داور اصلی اختصاص دارد."
      />
      <ArbitratorForm csrfToken={csrfToken} />
    </div>
  );
}
