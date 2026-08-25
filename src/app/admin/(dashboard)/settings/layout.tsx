import { requireAdminSession } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { AdminPageHeader } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings-tabs";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession("settings");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="تنظیمات سایت"
        description="اطلاعات مؤسسه، هویت بصری و پیکربندی فنی وب‌سایت."
      />
      <SettingsTabs canAdvanced={can(session, "advanced")} />
      {children}
    </div>
  );
}
