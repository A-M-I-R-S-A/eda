import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "تنظیمات عمومی" };

export default async function AdminSettingsPage() {
  await requireAdminSession("settings");

  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  return <SettingsForm csrfToken={csrfToken} settings={settings} />;
}
