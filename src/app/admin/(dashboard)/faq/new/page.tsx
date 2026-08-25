import type { Metadata } from "next";
import { listFaqTopics } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { FaqForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "پرسش جدید" };

export default async function NewFaqPage() {
  await requireAdminSession("content");

  const [csrfToken, topics] = await Promise.all([
    getCsrfToken(),
    listFaqTopics(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.faq}
        title="افزودن پرسش متداول"
        description="پرسش‌ها به‌صورت داده ساختاریافته FAQPage نیز در نتایج جست‌وجو منتشر می‌شوند."
      />
      <FaqForm csrfToken={csrfToken} topics={topics} />
    </div>
  );
}
