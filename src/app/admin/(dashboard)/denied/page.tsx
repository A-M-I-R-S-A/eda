import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/auth/current-user";
import { permissionsFor } from "@/lib/auth/permissions";
import { USER_ROLE, USER_ROLE_DESCRIPTION } from "@/lib/config/labels";
import { ROUTES } from "@/lib/config/routes";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "دسترسی مجاز نیست" };

/**
 * Shown when a signed-in staff member opens a screen their role does not
 * cover. It names the role and what it *can* do rather than only refusing —
 * a bare "access denied" leaves someone unsure whether it is a bug.
 */
export default async function AccessDeniedPage() {
  const session = await requireAdminSession();
  const permissions = permissionsFor(session.role);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-full border border-warning/25 bg-warning-soft text-warning">
        <Icon name="lock" size={28} />
      </span>

      <h1 className="text-[1.375rem] font-bold text-navy-950">
        این بخش در دسترس شما نیست
      </h1>

      <p className="mt-3 text-[0.9375rem] leading-[2] text-muted">
        حساب کاربری شما با نقش «{USER_ROLE[session.role]}» ثبت شده است.
        {" "}
        {USER_ROLE_DESCRIPTION[session.role]}
      </p>

      {permissions.length === 0 && (
        <p className="mt-3 text-[0.875rem] text-muted">
          برای دسترسی به بخش‌های مدیریتی با مدیر ارشد سیستم تماس بگیرید.
        </p>
      )}

      <ButtonLink
        href={ROUTES.admin.root}
        variant="primary"
        size="md"
        icon="dashboard"
        className="mt-8"
      >
        بازگشت به داشبورد
      </ButtonLink>
    </div>
  );
}
