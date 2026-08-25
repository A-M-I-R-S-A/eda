import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { BrandingForm } from "@/components/admin/branding-form";

export const metadata: Metadata = { title: "هویت بصری" };

export default async function AdminBrandingPage() {
  await requireAdminSession("settings");

  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  return <BrandingForm branding={settings.branding} csrfToken={csrfToken} />;
}
