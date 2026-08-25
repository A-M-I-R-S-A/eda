import type { Metadata } from "next";
import { getSettings, listPages } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { HeaderForm } from "@/components/admin/header-form";

export const metadata: Metadata = { title: "تنظیمات هدر" };

export default async function AdminHeaderPage() {
  await requireAdminSession("settings");

  const [settings, pages, csrfToken] = await Promise.all([
    getSettings(),
    listPages(),
    getCsrfToken(),
  ]);

  return (
    <HeaderForm
      header={settings.header}
      pages={pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
      }))}
      csrfToken={csrfToken}
    />
  );
}
