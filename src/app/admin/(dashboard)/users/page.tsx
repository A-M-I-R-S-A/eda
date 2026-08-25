import type { Metadata } from "next";
import { listUsers } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { USER_ROLE, USER_ROLE_DESCRIPTION } from "@/lib/config/labels";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { fa } from "@/lib/utils/persian";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader, FilterToolbar, Panel } from "@/components/admin/ui";
import { UserManager } from "@/components/admin/user-manager";

export const metadata: Metadata = { title: "کاربران" };

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

/**
 * Administrator accounts.
 *
 * Only staff roles are listed: public visitors who submitted a form are not
 * "users" of the panel and would bury the handful of accounts that matter.
 */
export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requireAdminSession("users");
  const { q, page } = await searchParams;

  const [result, csrfToken] = await Promise.all([
    listUsers({
      search: q,
      role: "staff",
      page: Math.max(1, Number(page) || 1),
      pageSize: 20,
    }),
    getCsrfToken(),
  ]);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.users}?${query}` : ROUTES.admin.users;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="کاربران پنل مدیریت"
        description={`${fa(result.total)} حساب کاربری با دسترسی به پنل`}
      />

      <Panel bodyClassName="p-0">
        <FilterToolbar
          action={ROUTES.admin.users}
          searchValue={q ?? ""}
          searchPlaceholder="جست‌وجو بر اساس نام، ایمیل یا شماره تماس…"
        />

        <div className="p-5">
          <UserManager
            users={result.items}
            currentUserId={session.sub}
            csrfToken={csrfToken}
          />

          {result.totalPages > 1 && (
            <Pagination
              className="mt-8"
              page={result.page}
              totalPages={result.totalPages}
              hrefFor={hrefFor}
            />
          )}
        </div>
      </Panel>

      <Panel
        title="سطوح دسترسی"
        description="هر نقش تنها به بخش‌های مربوط به خود دسترسی دارد؛ بخش‌های دیگر حتی در منو نمایش داده نمی‌شوند."
      >
        <ul className="flex flex-col gap-3">
          {ASSIGNABLE_ROLES.map((role) => (
            <li
              key={role}
              className="flex gap-3 rounded-sm border border-line-2 bg-white p-4"
            >
              <Icon
                name="shield"
                size={18}
                className="mt-0.5 shrink-0 text-gold-600"
              />
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-navy-900">
                  {USER_ROLE[role]}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-[1.95] text-muted">
                  {USER_ROLE_DESCRIPTION[role]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
