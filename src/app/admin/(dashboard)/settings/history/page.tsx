import type { Metadata } from "next";
import { listSettingsRevisions } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { Panel } from "@/components/admin/ui";
import { SettingsHistory } from "@/components/admin/settings-history";

export const metadata: Metadata = { title: "تاریخچه تنظیمات" };

export default async function SettingsHistoryPage() {
  await requireAdminSession("settings");

  const [revisions, csrfToken] = await Promise.all([
    listSettingsRevisions(),
    getCsrfToken(),
  ]);

  return (
    <Panel
      title="تاریخچه تنظیمات"
      description="پیش از هر تغییر در تنظیمات، مقادیر قبلی به‌صورت خودکار نگهداری می‌شود."
    >
      <SettingsHistory revisions={revisions} csrfToken={csrfToken} />
    </Panel>
  );
}
