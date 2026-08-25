import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { AdminPageHeader } from "@/components/admin/ui";
import { SeoSettingsForm } from "@/components/admin/seo-settings-form";

export const metadata: Metadata = { title: "سئو" };

export default async function AdminSeoPage() {
  await requireAdminSession("settings");

  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="تنظیمات سئو"
        description="مقادیر پیش‌فرضی که هر صفحه در نبود تنظیمات اختصاصی از آن‌ها استفاده می‌کند."
      />
      <SeoSettingsForm seo={settings.seo} csrfToken={csrfToken} />
    </div>
  );
}
