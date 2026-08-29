import { getDashboardStats, listNewsletter } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { AdminPageHeader } from "@/components/admin/ui";
import { FormsTabs } from "@/components/admin/forms-tabs";

/**
 * The submissions inbox.
 *
 * Contact messages, bookings and newsletter sign-ups
 * all arrive from public forms, so they share one screen with one status
 * vocabulary instead of four separate inboxes.
 */
export default async function FormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession("operations");

  const [stats, newsletter] = await Promise.all([
    getDashboardStats(),
    listNewsletter({ status: "new", pageSize: 1 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="فرم‌ها"
        description="همه پیام‌ها و درخواست‌هایی که از فرم‌های وب‌سایت دریافت می‌شود."
      />
      <FormsTabs
        counts={{
          messages: stats.unreadMessages,
          requests: stats.newRequests,
          appointments: stats.todayAppointments,
          newsletter: newsletter.total,
        }}
      />
      {children}
    </div>
  );
}
