import type { Metadata } from "next";
import { listNewsletter } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { NEWSLETTER_STATUS } from "@/lib/config/labels";
import {
  deleteNewsletterAction,
  updateNewsletterStatusAction,
} from "@/lib/actions/taxonomy";
import { formatJalali, formatRelative } from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import type { NewsletterStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { ConfirmDelete, QuickAction } from "@/components/admin/actions";
import {
  DataTable,
  FilterSelect,
  FilterToolbar,
  Panel,
  RowActions,
  Td,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "خبرنامه" };

const STATUS_FILTERS = [
  { value: "", label: "همه مشترکان" },
  ...(Object.keys(NEWSLETTER_STATUS) as NewsletterStatus[]).map((status) => ({
    value: status,
    label: NEWSLETTER_STATUS[status].label,
  })),
];

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}

/**
 * Newsletter roster.
 *
 * Unsubscribing is kept as a status rather than a delete: removing the row
 * outright would let the same address be re-added by a later sign-up, which is
 * exactly what the person asked not to happen.
 */
export default async function AdminNewsletterPage({ searchParams }: PageProps) {
  await requireAdminSession("operations");

  const { status, q, page } = await searchParams;
  const validStatus =
    status && status in NEWSLETTER_STATUS ? (status as NewsletterStatus) : "all";

  const [result, csrfToken] = await Promise.all([
    listNewsletter({
      status: validStatus,
      search: q,
      page: Math.max(1, Number(page) || 1),
      pageSize: 25,
    }),
    getCsrfToken(),
  ]);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.newsletter}?${query}` : ROUTES.admin.newsletter;
  };

  return (
    <Panel bodyClassName="p-0">
      <FilterToolbar
        action={ROUTES.admin.newsletter}
        searchValue={q ?? ""}
        searchPlaceholder="جست‌وجو بر اساس ایمیل یا نام…"
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
          icon="send"
          title={
            q || status ? "مشترکی یافت نشد" : "هنوز کسی در خبرنامه ثبت‌نام نکرده است"
          }
          description={
            q || status
              ? "فیلترها را تغییر دهید یا عبارت دیگری جست‌وجو کنید."
              : "نشانی‌هایی که از طریق فرم خبرنامه وب‌سایت ثبت شوند، اینجا نمایش داده می‌شوند."
          }
        />
      ) : (
        <>
          <DataTable
            caption="مشترکان خبرنامه"
            headers={["ایمیل", "نام", "منبع", "تاریخ ثبت", "وضعیت", ""]}
          >
            {result.items.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-paper-2/50">
                <Td nowrap>
                  <a
                    href={`mailto:${entry.email}`}
                    dir="ltr"
                    className="block text-start font-medium text-navy-900 hover:text-navy-700"
                  >
                    {entry.email}
                  </a>
                </Td>

                <Td nowrap>{entry.name || "—"}</Td>

                <Td nowrap>
                  <span className="text-[0.75rem] text-muted">{entry.source}</span>
                </Td>

                <Td nowrap>
                  <span className="block tabular-nums">
                    {formatJalali(entry.createdAt)}
                  </span>
                  <span className="block text-[0.6875rem] text-muted-2">
                    {formatRelative(entry.createdAt)}
                  </span>
                </Td>

                <Td nowrap>
                  <Badge tone={NEWSLETTER_STATUS[entry.status].tone} dot size="sm">
                    {NEWSLETTER_STATUS[entry.status].label}
                  </Badge>
                </Td>

                <Td nowrap>
                  <RowActions>
                    {entry.status !== "confirmed" && (
                      <QuickAction
                        action={updateNewsletterStatusAction}
                        csrfToken={csrfToken}
                        fields={{ id: entry.id, status: "confirmed" }}
                        icon="check-circle"
                        label="تأیید اشتراک"
                        tone="success"
                      />
                    )}
                    {entry.status !== "unsubscribed" && (
                      <QuickAction
                        action={updateNewsletterStatusAction}
                        csrfToken={csrfToken}
                        fields={{ id: entry.id, status: "unsubscribed" }}
                        icon="eye-off"
                        label="لغو اشتراک"
                      />
                    )}
                    <ConfirmDelete
                      action={deleteNewsletterAction}
                      csrfToken={csrfToken}
                      id={entry.id}
                      label="حذف مشترک"
                    />
                  </RowActions>
                </Td>
              </tr>
            ))}
          </DataTable>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-5">
            <p className="text-[0.75rem] text-muted">
              مجموع {fa(result.total)} نشانی ثبت‌شده
            </p>
            {result.totalPages > 1 && (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                hrefFor={hrefFor}
              />
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
