import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { AdminPageHeader } from "@/components/admin/ui";
import { AppointmentSettingsForm } from "@/components/admin/appointment-settings-form";

export const metadata: Metadata = { title: "تنظیمات نوبت‌دهی" };

export default async function AdminAppointmentSettingsPage() {
  await requireAdminSession("settings");

  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.appointments}
        title="تنظیمات نوبت‌دهی"
        description="انواع جلسه، روزها و ساعات کاری، ظرفیت روزانه و روزهای تعطیل."
      />
      <AppointmentSettingsForm
        settings={settings.appointments}
        csrfToken={csrfToken}
      />
    </div>
  );
}
