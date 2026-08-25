import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { readCredentials } from "@/lib/sms/client";
import { SmsSettingsForm } from "@/components/admin/sms-settings-form";

export const metadata: Metadata = { title: "تنظیمات پیامک" };

/**
 * SMS configuration.
 *
 * Asks for the `advanced` capability rather than `settings`: enabling this
 * spends the institution's SMS credit and puts messages out over its name.
 * Only whether the API key *exists* is passed to the client — never its value.
 */
export default async function AdminSmsSettingsPage() {
  await requireAdminSession("advanced");

  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  return (
    <SmsSettingsForm
      sms={settings.sms}
      csrfToken={csrfToken}
      credentialsPresent={readCredentials() !== null}
    />
  );
}
