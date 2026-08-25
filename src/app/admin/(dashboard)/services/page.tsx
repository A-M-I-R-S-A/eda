import type { Metadata } from "next";
import { listServices } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { CONTENT_STATUS, SERVICE_CATEGORY } from "@/lib/config/labels";
import { deleteServiceAction } from "@/lib/actions/admin";
import { reorderServicesAction } from "@/lib/actions/taxonomy";
import { isLive } from "@/lib/cms/status";
import { faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { ConfirmDelete } from "@/components/admin/actions";
import { ReorderPanel } from "@/components/admin/reorder-panel";
import {
  AdminPageHeader,
  DataTable,
  IconAction,
  Panel,
  RowActions,
  Td,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "خدمات" };

export default async function AdminServicesPage() {
  await requireAdminSession("content");

  const [services, csrfToken] = await Promise.all([
    listServices(),
    getCsrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="خدمات"
        description={`${faNumber(services.length)} خدمت تعریف‌شده`}
        actions={
          <ButtonLink
            href={ROUTES.admin.serviceNew}
            variant="primary"
            size="sm"
            icon="plus"
          >
            افزودن خدمت
          </ButtonLink>
        }
      />

      <Panel bodyClassName="p-0">
        {services.length === 0 ? (
          <EmptyState
            icon="briefcase"
            title="هنوز خدمتی تعریف نشده است"
            description="با افزودن نخستین خدمت، بخش «خدمات» در وب‌سایت فعال می‌شود."
            action={{ label: "افزودن خدمت", href: ROUTES.admin.serviceNew }}
          />
        ) : (
          <DataTable
            caption="فهرست خدمات"
            headers={["عنوان", "دسته‌بندی", "توضیح کوتاه", "وضعیت", ""]}
          >
            {services.map((service) => (
              <tr key={service.id} className="transition-colors hover:bg-paper-2/50">
                <Td>
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-line-2 text-navy-700">
                      <Icon name={service.icon as IconName} size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900">
                        {service.title}
                      </span>
                      <span dir="ltr" className="block text-[0.6875rem] text-muted-2">
                        /{service.slug}
                      </span>
                    </span>
                  </span>
                </Td>

                <Td nowrap>{SERVICE_CATEGORY[service.category]}</Td>

                <Td className="max-w-md">
                  <span className="line-clamp-2 text-muted">
                    {service.shortDescription}
                  </span>
                </Td>

                <Td nowrap>
                  <Badge tone={CONTENT_STATUS[service.status].tone} dot size="sm">
                    {CONTENT_STATUS[service.status].label}
                  </Badge>
                </Td>

                <Td nowrap>
                  <RowActions>
                    {isLive(service) && (
                      <IconAction
                        icon="external"
                        label="مشاهده در وب‌سایت"
                        href={ROUTES.service(service.slug)}
                      />
                    )}
                    <IconAction
                      icon="edit"
                      label="ویرایش"
                      href={ROUTES.admin.serviceEdit(service.id)}
                    />
                    <ConfirmDelete
                      action={deleteServiceAction}
                      csrfToken={csrfToken}
                      id={service.id}
                      label="حذف خدمت"
                    />
                  </RowActions>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      {services.length > 1 && (
        <Panel
          title="ترتیب نمایش"
          description="ترتیب خدمات در صفحه خدمات، فوتر و بخش‌های «خدمات» صفحات."
        >
          <ReorderPanel
            items={services}
            action={reorderServicesAction}
            csrfToken={csrfToken}
            itemLabel={(service) => service.title}
            renderItem={(service) => (
              <span className="flex items-center gap-2.5">
                <Icon
                  name={service.icon as IconName}
                  size={16}
                  className="shrink-0 text-navy-700"
                />
                <span className="truncate text-[0.875rem] font-medium text-navy-900">
                  {service.title}
                </span>
                {!isLive(service) && (
                  <span className="shrink-0 rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.625rem] text-muted">
                    {CONTENT_STATUS[service.status].label}
                  </span>
                )}
              </span>
            )}
          />
        </Panel>
      )}
    </div>
  );
}
