import type { Metadata } from "next";
import type { ContactMessageStatus } from "@/types";
import { listMessages } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { CONTACT_MESSAGE_STATUS } from "@/lib/config/labels";
import { getCsrfToken } from "@/lib/security/csrf";
import { requireAdminSession } from "@/lib/auth/current-user";
import {
  deleteMessageAction,
  updateMessageStatusAction,
} from "@/lib/actions/admin";
import { formatJalaliDateTime, formatRelative } from "@/lib/utils/jalali";
import { faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { ConfirmDelete, QuickAction } from "@/components/admin/actions";
import {
  AdminPageHeader,
  FilterSelect,
  FilterToolbar,
  Panel,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "پیام‌های تماس" };

const STATUS_FILTERS = [
  { value: "", label: "همه پیام‌ها" },
  ...(Object.keys(CONTACT_MESSAGE_STATUS) as ContactMessageStatus[]).map(
    (status) => ({ value: status, label: CONTACT_MESSAGE_STATUS[status].label }),
  ),
];

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}

export default async function AdminMessagesPage({ searchParams }: PageProps) {
  await requireAdminSession("operations");
  const { status, q, page } = await searchParams;

  const validStatus =
    status && status in CONTACT_MESSAGE_STATUS
      ? (status as ContactMessageStatus)
      : "all";

  const [result, csrfToken] = await Promise.all([
    listMessages({
      status: validStatus,
      search: q,
      page: Math.max(1, Number(page) || 1),
      pageSize: 12,
    }),
    getCsrfToken(),
  ]);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.messages}?${query}` : ROUTES.admin.messages;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="پیام‌های تماس"
        description={`${faNumber(result.total)} پیام دریافت‌شده از فرم تماس`}
      />

      <Panel bodyClassName="p-0">
        <FilterToolbar
          action={ROUTES.admin.messages}
          searchValue={q ?? ""}
          searchPlaceholder="جست‌وجو در نام، شماره، موضوع و متن پیام…"
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
            icon="mail-open"
            title="پیامی برای نمایش وجود ندارد"
            description="پیام‌های ارسالی از فرم تماس وب‌سایت در این بخش نمایش داده می‌شوند."
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {result.items.map((message) => {
                const tone = CONTACT_MESSAGE_STATUS[message.status];

                return (
                  <li key={message.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-[0.9375rem] font-bold text-navy-900">
                            {message.subject}
                          </h2>
                          <Badge tone={tone.tone} dot size="sm">
                            {tone.label}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.75rem] text-muted">
                          <span className="flex items-center gap-1.5">
                            <Icon name="user" size={13} className="text-gold-600" />
                            {message.fullName}
                          </span>
                          <a
                            href={`tel:${message.phone}`}
                            dir="ltr"
                            className="flex items-center gap-1.5 hover:text-navy-800"
                          >
                            <Icon name="phone" size={13} className="text-gold-600" />
                            {message.phone}
                          </a>
                          {message.email && (
                            <a
                              href={`mailto:${message.email}`}
                              dir="ltr"
                              className="flex items-center gap-1.5 hover:text-navy-800"
                            >
                              <Icon name="mail" size={13} className="text-gold-600" />
                              {message.email}
                            </a>
                          )}
                          <span
                            className="flex items-center gap-1.5"
                            title={formatJalaliDateTime(message.createdAt)}
                          >
                            <Icon name="clock" size={13} className="text-gold-600" />
                            {formatRelative(message.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {message.status !== "completed" && (
                          <QuickAction
                            action={updateMessageStatusAction}
                            csrfToken={csrfToken}
                            fields={{ id: message.id, status: "completed" }}
                            icon="check"
                            label="علامت‌گذاری به‌عنوان پاسخ داده‌شده"
                            tone="success"
                          />
                        )}
                        {message.status === "new" && (
                          <QuickAction
                            action={updateMessageStatusAction}
                            csrfToken={csrfToken}
                            fields={{ id: message.id, status: "read" }}
                            icon="eye"
                            label="علامت‌گذاری به‌عنوان خوانده‌شده"
                          />
                        )}
                        {message.status !== "archived" && (
                          <QuickAction
                            action={updateMessageStatusAction}
                            csrfToken={csrfToken}
                            fields={{ id: message.id, status: "archived" }}
                            icon="inbox"
                            label="بایگانی"
                          />
                        )}
                        {(
                          <ConfirmDelete
                            action={deleteMessageAction}
                            csrfToken={csrfToken}
                            id={message.id}
                            label="حذف پیام"
                          />
                        )}
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-line rounded-sm bg-paper-2/70 px-4 py-3.5 text-[0.875rem] leading-[2] text-ink-2">
                      {message.message}
                    </p>
                  </li>
                );
              })}
            </ul>

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
