import type { Metadata } from "next";
import Link from "next/link";
import { listPages } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { CONTENT_STATUS } from "@/lib/config/labels";
import { isLive, isPending } from "@/lib/cms/status";
import { formatJalali } from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import { AdminPageHeader, DataTable, Panel, RowActions, Td } from "@/components/admin/ui";
import { PageRowActions } from "@/components/admin/page-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "صفحات" };

/**
 * Pages list.
 *
 * The one place an administrator sees the whole site as a structure: what
 * exists, what is live, and what is still a draft. System pages are marked so
 * it is obvious why some rows cannot be deleted.
 */
export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminSession("content");

  const [{ q }, csrfToken] = await Promise.all([searchParams, getCsrfToken()]);
  const pages = await listPages({ search: q });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="صفحات"
        description="ساختار وب‌سایت. هر صفحه از بخش‌های مستقلی ساخته می‌شود که می‌توانید آن‌ها را جابه‌جا، پنهان یا حذف کنید."
        actions={
          <ButtonLink
            href={ROUTES.admin.pageNew}
            variant="primary"
            size="md"
            icon="plus"
          >
            صفحه جدید
          </ButtonLink>
        }
      />

      <Panel bodyClassName="p-0">
        <form
          action={ROUTES.admin.pages}
          method="get"
          className="border-b border-line px-5 py-4"
        >
          <div className="relative max-w-sm">
            <label htmlFor="q" className="sr-only">
              جست‌وجوی صفحه
            </label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="جست‌وجو بر اساس عنوان یا نامک…"
              className="h-10 w-full rounded-sm border border-line-2 bg-white ps-3.5 pe-10 text-[0.8125rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]"
            />
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-2"
            />
          </div>
        </form>

        {pages.length === 0 ? (
          <EmptyState
            icon="layers"
            title={q ? "صفحه‌ای یافت نشد" : "هنوز صفحه‌ای ساخته نشده است"}
            description={
              q
                ? "جست‌وجوی شما نتیجه‌ای نداشت."
                : "با ساخت نخستین صفحه شروع کنید."
            }
            action={
              q
                ? { label: "حذف فیلتر", href: ROUTES.admin.pages }
                : { label: "صفحه جدید", href: ROUTES.admin.pageNew }
            }
          />
        ) : (
          <DataTable
            caption="فهرست صفحات وب‌سایت"
            headers={[
              "عنوان",
              "نشانی",
              "بخش‌ها",
              "وضعیت",
              "آخرین تغییر",
              { label: "عملیات", className: "text-end" },
            ]}
          >
            {pages.map((page) => {
              const status = CONTENT_STATUS[page.status];
              const publicHref = page.slug ? `/${page.slug}` : "/";
              const visibleSections = page.sections.filter((s) => s.visible).length;

              return (
                <tr key={page.id} className="transition-colors hover:bg-paper-2/50">
                  <Td>
                    <Link
                      href={ROUTES.admin.pageSections(page.id)}
                      className="font-semibold text-navy-900 hover:text-navy-700"
                    >
                      {page.title}
                    </Link>
                    {page.system && (
                      <span className="ms-2 inline-flex items-center gap-1 rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.625rem] text-muted">
                        <Icon name="lock" size={11} />
                        سیستمی
                      </span>
                    )}
                  </Td>

                  <Td nowrap>
                    <span dir="ltr" className="block text-start text-muted">
                      {publicHref}
                    </span>
                  </Td>

                  <Td nowrap>
                    <span className="tabular-nums">
                      {fa(visibleSections)}
                      {visibleSections !== page.sections.length && (
                        <span className="text-muted-2">
                          {" "}
                          از {fa(page.sections.length)}
                        </span>
                      )}
                    </span>
                  </Td>

                  <Td nowrap>
                    <Badge tone={status.tone} dot size="sm">
                      {status.label}
                    </Badge>
                    {isPending(page) && page.scheduledFor && (
                      <span className="mt-1 block text-[0.6875rem] text-muted-2">
                        {formatJalali(page.scheduledFor)}
                      </span>
                    )}
                  </Td>

                  <Td nowrap className="text-muted">
                    {formatJalali(page.updatedAt)}
                  </Td>

                  <Td>
                    <RowActions>
                      {isLive(page) && (
                        <Link
                          href={publicHref}
                          target="_blank"
                          aria-label="مشاهده در سایت"
                          title="مشاهده در سایت"
                          className="flex size-9 items-center justify-center rounded-sm border border-line-2 text-muted transition-colors hover:border-navy-500 hover:text-navy-800"
                        >
                          <Icon name="external" size={16} />
                        </Link>
                      )}
                      <PageRowActions page={page} csrfToken={csrfToken} />
                    </RowActions>
                  </Td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}
