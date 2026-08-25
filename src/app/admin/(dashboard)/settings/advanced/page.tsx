import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { AdvancedForm } from "@/components/admin/advanced-form";

export const metadata: Metadata = { title: "تنظیمات پیشرفته" };

/**
 * Custom code runs on every page for every visitor, so this screen asks for
 * the `advanced` capability rather than `settings` — the super administrator
 * alone.
 */
export default async function AdminAdvancedPage() {
  await requireAdminSession("advanced");

  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  return <AdvancedForm code={settings.customCode} csrfToken={csrfToken} />;
}
