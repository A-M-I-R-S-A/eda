import { requireAdminSession } from "@/lib/auth/current-user";
import { AdminPageHeader } from "@/components/admin/ui";
import { NavigationTabs } from "@/components/admin/navigation-tabs";

/**
 * Header and footer share a screen because they are the same job — deciding
 * what the visitor can reach from anywhere on the site.
 */
export default async function NavigationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession("settings");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="منو و فوتر"
        description="پیوندهای ناوبری، دکمه‌های اقدام و ساختار فوتر وب‌سایت."
      />
      <NavigationTabs />
      {children}
    </div>
  );
}
