import type { Metadata } from "next";
import { listAuditLog } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { ROUTES } from "@/lib/config/routes";
import {
  AUDIT_ACTION,
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY,
  AUDIT_ENTITY_OPTIONS,
  USER_ROLE,
} from "@/lib/config/labels";
import { formatJalaliDateTime, formatRelative } from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import type { AuditAction, AuditEntity } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import {
  AdminPageHeader,
  DataTable,
  FilterSelect,
  FilterToolbar,
  Panel,
  Td,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "گزارش فعالیت" };

interface PageProps {
  searchParams: Promise<{
    q?: string;
    entity?: string;
    action?: string;
    page?: string;
  }>;
}

/**
 * Audit log.
 *
 * Read-only by design: an activity record that administrators can edit is not
 * an activity record. Old entries age out through the cap in the storage
 * layer rather than through a delete button.
 */
export default async function AdminAuditPage({ searchParams }: PageProps) {
  await requireAdminSession("audit");

  const { q, entity, action, page } = await searchParams;

  const result = await listAuditLog({
    search: q,
    entity: (entity as AuditEntity) || "all",
    action: (action as AuditAction) || "all",
    page: Math.max(1, Number(page) || 1),
    pageSize: 30,
  });

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.audit}?${query}` : ROUTES.admin.audit;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="گزارش فعالیت"
        description={`${fa(result.total)} رویداد ثبت‌شده — آخرین تغییرات محتوا، تنظیمات و کاربران`}
      />

      <Panel bodyClassName="p-0">
        <FilterToolbar
          action={ROUTES.admin.audit}
          searchValue={q ?? ""}
          searchPlaceholder="جست‌وجو بر اساس عنوان، کاربر یا توضیح…"
        >
          <FilterSelect
            name="entity"
            value={entity}
            label="فیلتر بخش"
            options={AUDIT_ENTITY_OPTIONS}
          />
          <FilterSelect
            name="action"
            value={action}
            label="فیلتر عملیات"
            options={AUDIT_ACTION_OPTIONS}
          />
        </FilterToolbar>

        {result.items.length === 0 ? (
          <EmptyState
            icon="history"
            title={q || entity || action ? "رویدادی یافت نشد" : "هنوز رویدادی ثبت نشده است"}
            description={
              q || entity || action
                ? "فیلترها را تغییر دهید یا عبارت دیگری جست‌وجو کنید."
                : "هر تغییری که در پنل مدیریت انجام شود، اینجا ثبت می‌گردد."
            }
          />
        ) : (
          <>
            <DataTable
              caption="گزارش فعالیت مدیران"
              headers={["زمان", "کاربر", "عملیات", "بخش", "مورد", "نشانی IP"]}
            >
              {result.items.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-paper-2/50">
                  <Td nowrap>
                    <span className="block text-navy-900">
                      {formatRelative(entry.at)}
                    </span>
                    <span className="block text-[0.6875rem] text-muted-2 tabular-nums">
                      {formatJalaliDateTime(entry.at)}
                    </span>
                  </Td>

                  <Td nowrap>
                    <span className="block font-medium text-navy-900">
                      {entry.actorName}
                    </span>
                    <span className="block text-[0.6875rem] text-muted-2">
                      {USER_ROLE[entry.actorRole]}
                    </span>
                  </Td>

                  <Td nowrap>
                    <Badge tone={AUDIT_ACTION[entry.action].tone} dot size="sm">
                      {AUDIT_ACTION[entry.action].label}
                    </Badge>
                  </Td>

                  <Td nowrap>{AUDIT_ENTITY[entry.entity]}</Td>

                  <Td className="max-w-sm">
                    <span className="block truncate font-medium text-navy-900">
                      {entry.entityLabel}
                    </span>
                    {entry.detail && (
                      <span className="block truncate text-[0.6875rem] text-muted">
                        {entry.detail}
                      </span>
                    )}
                  </Td>

                  <Td nowrap>
                    <span dir="ltr" className="text-[0.6875rem] text-muted-2">
                      {entry.ip ?? "—"}
                    </span>
                  </Td>
                </tr>
              ))}
            </DataTable>

            {result.totalPages > 1 && (
              <div className="border-t border-line px-5 py-5">
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  hrefFor={hrefFor}
                />
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
