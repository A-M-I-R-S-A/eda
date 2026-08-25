import type { Metadata } from "next";
import { getSettings, listPages } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { FooterForm } from "@/components/admin/footer-form";

export const metadata: Metadata = { title: "تنظیمات فوتر" };

export default async function AdminFooterPage() {
  await requireAdminSession("settings");

  const [settings, pages, csrfToken] = await Promise.all([
    getSettings(),
    listPages(),
    getCsrfToken(),
  ]);

  return (
    <FooterForm
      footer={settings.footer}
      pages={pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
      }))}
      csrfToken={csrfToken}
    />
  );
}
