import type { Metadata } from "next";
import type { RequestStatus } from "@/types";
import { listRequests } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { REQUEST_STATUS, REQUEST_TYPE } from "@/lib/config/labels";
import { formatJalaliShort, formatRelative } from "@/lib/utils/jalali";
import { fa, faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import {
  AdminPageHeader,
  DataTable,
  FilterSelect,
  FilterToolbar,
  IconAction,
  Panel,
  RowActions,
  Td,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "درخواست‌ها" };

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "همه وضعیت‌ها" },
  ...(Object.keys(REQUEST_STATUS) as RequestStatus[]).map((status) => ({
    value: status,
    label: REQUEST_STATUS[status].label,
  })),
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminRequestsPage({ searchParams }: PageProps) {
  const { q, status, page } = await searchParams;

  const validStatus =
    status && status in REQUEST_STATUS ? (status as RequestStatus) : "all";

  const result = await listRequests({
    search: q,
    status: validStatus,
    page: Math.max(1, Number(page) || 1),
    pageSize: 15,
  });

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.requests}?${query}` : ROUTES.admin.requests;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="درخواست‌های مشاوره و داوری"
        description={`${faNumber(result.total)} درخواست ثبت‌شده`}
      />

      <Panel bodyClassName="p-0">
        <FilterToolbar
          action={ROUTES.admin.requests}
          searchValue={q ?? ""}
          searchPlaceholder="جست‌وجو بر اساس کد پیگیری، نام، شماره یا موضوع…"
        >
          <FilterSelect
            name="status"
            value={status}
            label="فیلتر وضعیت"
            options={STATUS_FILTERS}
          />
        </FilterToolbar>

        {result.items.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={q || status ? "نتیجه‌ای یافت نشد" : "هنوز درخواستی ثبت نشده است"}
            description={
              q || status
                ? "فیلترها را تغییر دهید یا عبارت دیگری جست‌وجو کنید."
                : "درخواست‌های ثبت‌شده از وب‌سایت در این بخش نمایش داده می‌شوند."
            }
            action={
              q || status
                ? { label: "حذف فیلترها", href: ROUTES.admin.requests }
                : undefined
            }
          />
        ) : (
          <>
            <DataTable
              caption="فهرست درخواست‌های ثبت‌شده"
              headers={[
                "کد پیگیری",
                "متقاضی",
                "نوع درخواست",
                "حوزه حقوقی",
                "پیوست",
                "وضعیت",
                "تاریخ ثبت",
                "",
              ]}
            >
              {result.items.map((request) => (
                <tr key={request.id} className="transition-colors hover:bg-paper-2/50">
                  <Td nowrap>
                    <span dir="ltr" className="font-semibold text-navy-900">
                      {request.trackingCode}
                    </span>
                  </Td>
                  <Td>
                    <span className="block font-medium text-navy-900">
                      {request.fullName}
                    </span>
                    <span dir="ltr" className="block text-[0.6875rem] text-muted-2">
                      {request.phone}
                    </span>
                  </Td>
                  <Td nowrap>{REQUEST_TYPE[request.requestType]}</Td>
                  <Td className="max-w-[12rem] truncate">{request.legalArea}</Td>
                  <Td nowrap>
                    {request.attachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-navy-800">
                        <Icon name="document" size={14} />
                        {fa(request.attachments.length)}
                      </span>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                  </Td>
                  <Td nowrap>
                    <Badge tone={REQUEST_STATUS[request.status].tone} dot size="sm">
                      {REQUEST_STATUS[request.status].label}
                    </Badge>
                  </Td>
                  <Td nowrap>
                    <span className="block text-navy-800 tabular-nums">
                      {formatJalaliShort(request.createdAt)}
                    </span>
                    <span className="block text-[0.6875rem] text-muted-2">
                      {formatRelative(request.createdAt)}
                    </span>
                  </Td>
                  <Td nowrap>
                    <RowActions>
                      <IconAction
                        icon="eye"
                        label="مشاهده پرونده"
                        href={ROUTES.admin.request(request.id)}
                      />
                    </RowActions>
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
