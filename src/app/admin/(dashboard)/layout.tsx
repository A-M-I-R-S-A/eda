import { requireAdminSession } from "@/lib/auth/current-user";
import { getDashboardStats } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { ROUTES } from "@/lib/config/routes";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Authenticated admin shell.
 *
 * `requireAdminSession()` runs on the server for *every* page under this
 * layout — the edge proxy is the fast gate, this is the authoritative one. No
 * capability is required here because each screen gates itself; this only
 * establishes that the visitor is staff at all.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  const stats = await getDashboardStats();

  /**
   * Operational counters are only fetched into the rail for roles that can
   * open those screens — a badge advertising unread enquiries to an editor
   * who cannot read them is a small information leak and a dead end.
   */
  const badges = can(session, "operations")
    ? {
        [ROUTES.admin.requests]: stats.newRequests,
        [ROUTES.admin.forms]: stats.unreadMessages,
        [ROUTES.admin.appointments]: stats.todayAppointments,
      }
    : undefined;

  return (
    <AdminShell session={session} badges={badges}>
      {children}
    </AdminShell>
  );
}
