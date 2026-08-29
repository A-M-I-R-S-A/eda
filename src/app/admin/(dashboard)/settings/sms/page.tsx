import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { fetchCredit, resolveCredentials } from "@/lib/sms/client";
import { SmsSettingsForm } from "@/components/admin/sms-settings-form";

export const metadata: Metadata = { title: "تنظیمات پیامک" };

/**
 * SMS configuration.
 *
 * Asks for the `advanced` capability rather than `settings`: what is edited
 * here spends the institution's SMS credit and puts messages out over its
 * name, and since the provider key itself is now editable, the screen hands
 * out the ability to redirect that spend.
 *
 * The stored key never reaches the browser. What the form receives is whether
 * one exists, whether it came from the environment rather than the panel, and
 * — as the only honest proof that it works — the account credit read back
 * from the provider with it.
 */
export default async function AdminSmsSettingsPage() {
  await requireAdminSession("advanced");

  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  const credentials = resolveCredentials(settings.sms);
  const credit = await fetchCredit(credentials);

  return (
    <SmsSettingsForm
      sms={settings.sms}
      csrfToken={csrfToken}
      keyStored={Boolean(settings.sms.apiKey?.trim())}
      keyFromEnvironment={
        !settings.sms.apiKey?.trim() && Boolean(process.env.SMSIR_API_KEY?.trim())
      }
      credit={credit}
    />
  );
}
