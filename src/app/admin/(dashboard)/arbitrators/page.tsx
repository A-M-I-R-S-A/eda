import type { Metadata } from "next";
import { listArbitrators } from "@/lib/db";
import { ROUTES, arbitratorPublicHref } from "@/lib/config/routes";
import { getCsrfToken } from "@/lib/security/csrf";
import { getCurrentSession } from "@/lib/auth/current-user";
import { canManageSystem } from "@/lib/auth/session";
import { deleteArbitratorAction } from "@/lib/actions/admin";
import { fa, faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Portrait } from "@/components/brand/portrait";
import { ConfirmDelete } from "@/components/admin/actions";
import {
  AdminPageHeader,
  DataTable,
  IconAction,
  Panel,
  RowActions,
  Td,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "داور" };

export default async function AdminArbitratorsPage() {
  const [arbitrators, csrfToken, session] = await Promise.all([
    listArbitrators(),
    getCsrfToken(),
    getCurrentSession(),
  ]);

  const isAdmin = canManageSystem(session);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="داور مؤسسه"
        description={`${faNumber(arbitrators.length)} پروفایل ثبت‌شده`}
        actions={
          <ButtonLink
            href={ROUTES.admin.arbitratorNew}
            variant="primary"
            size="sm"
            icon="plus"
          >
            افزودن داور
          </ButtonLink>
        }
      />

      <Panel bodyClassName="p-0">
        {arbitrators.length === 0 ? (
          <EmptyState
            icon="gavel"
            title="هنوز پروفایلی ثبت نشده است"
            description="با افزودن داور، بخش «درباره داور» در وب‌سایت فعال می‌شود."
            action={{ label: "افزودن داور", href: ROUTES.admin.arbitratorNew }}
          />
        ) : (
          <DataTable
            caption="پروفایل داور مؤسسه"
            headers={[
              "نام",
              "سمت",
              "حوزه‌های تخصصی",
              "سابقه",
              "رزرو آنلاین",
              "وضعیت",
              "ترتیب",
              "",
            ]}
          >
            {arbitrators.map((arbitrator, index) => (
              <tr key={arbitrator.id} className="transition-colors hover:bg-paper-2/50">
                <Td>
                  <span className="flex items-center gap-3">
                    <Portrait
                      fullName={arbitrator.fullName}
                      photoUrl={arbitrator.photoUrl}
                      rounded
                      sizes="40px"
                      className="size-10 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900">
                        {arbitrator.fullName}
                      </span>
                      <span dir="ltr" className="block text-[0.6875rem] text-muted-2">
                        /{arbitrator.slug}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td className="max-w-[13rem] truncate">{arbitrator.title}</Td>
                <Td className="max-w-[15rem] truncate">
                  {arbitrator.expertise.slice(0, 2).join("، ")}
                </Td>
                <Td nowrap>{fa(arbitrator.yearsOfExperience)} سال</Td>
                <Td nowrap>
                  {arbitrator.bookable ? (
                    <Badge tone="success" size="sm">فعال</Badge>
                  ) : (
                    <Badge tone="neutral" size="sm">غیرفعال</Badge>
                  )}
                </Td>
                <Td nowrap>
                  <Badge tone={arbitrator.published ? "success" : "neutral"} dot size="sm">
                    {arbitrator.published ? "منتشر شده" : "پیش‌نویس"}
                  </Badge>
                </Td>
                <Td nowrap className="tabular-nums">{fa(arbitrator.order)}</Td>
                <Td nowrap>
                  <RowActions>
                    <IconAction
                      icon="external"
                      label="مشاهده در وب‌سایت"
                      href={arbitratorPublicHref(arbitrator.slug, index === 0)}
                    />
                    <IconAction
                      icon="edit"
                      label="ویرایش"
                      href={ROUTES.admin.arbitratorEdit(arbitrator.id)}
                    />
                    {isAdmin && (
                      <ConfirmDelete
                        action={deleteArbitratorAction}
                        csrfToken={csrfToken}
                        id={arbitrator.id}
                        label="حذف داور"
                      />
                    )}
                  </RowActions>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}
