import type { Metadata } from "next";
import type { AppointmentStatus } from "@/types";
import { listAppointments } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  APPOINTMENT_STATUS,
  MEETING_MODE,
} from "@/lib/config/labels";
import { getCsrfToken } from "@/lib/security/csrf";
import { updateAppointmentStatusAction } from "@/lib/actions/admin";
import { formatJalali } from "@/lib/utils/jalali";
import { fa, faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { QuickAction } from "@/components/admin/actions";
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

export const metadata: Metadata = { title: "نوبت‌ها" };

const STATUS_FILTERS = [
  { value: "", label: "همه وضعیت‌ها" },
  ...(Object.keys(APPOINTMENT_STATUS) as AppointmentStatus[]).map((status) => ({
    value: status,
    label: APPOINTMENT_STATUS[status].label,
  })),
];

const SCOPE_FILTERS = [
  { value: "", label: "همه تاریخ‌ها" },
  { value: "today", label: "امروز" },
  { value: "upcoming", label: "آینده" },
  { value: "past", label: "گذشته" },
];

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    scope?: string;
    page?: string;
  }>;
}

export default async function AdminAppointmentsPage({ searchParams }: PageProps) {
  const { q, status, scope, page } = await searchParams;

  const validStatus =
    status && status in APPOINTMENT_STATUS ? (status as AppointmentStatus) : "all";
  const validScope =
    scope === "today" || scope === "upcoming" || scope === "past" ? scope : "all";

  const [result, csrfToken] = await Promise.all([
    listAppointments({
      search: q,
      status: validStatus,
      scope: validScope,
      page: Math.max(1, Number(page) || 1),
      pageSize: 15,
    }),
    getCsrfToken(),
  ]);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (scope) params.set("scope", scope);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.appointments}?${query}` : ROUTES.admin.appointments;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="مدیریت نوبت‌ها"
        description={`${faNumber(result.total)} رزرو ثبت‌شده`}
        actions={
          <>
            <ButtonLink
              href={ROUTES.admin.appointmentCalendar}
              variant="outline"
              size="sm"
              icon="calendar"
            >
              نمای تقویم
            </ButtonLink>
            <ButtonLink
              href={ROUTES.admin.appointmentSettings}
              variant="outline"
              size="sm"
              icon="settings"
            >
              تنظیمات نوبت‌دهی
            </ButtonLink>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        <FilterToolbar
          action={ROUTES.admin.appointments}
          searchValue={q ?? ""}
          searchPlaceholder="جست‌وجو بر اساس کد رزرو، نام، شماره یا مشاور…"
        >
          <FilterSelect
            name="status"
            value={status}
            label="فیلتر وضعیت"
            options={STATUS_FILTERS}
          />
          <FilterSelect
            name="scope"
            value={scope}
            label="فیلتر بازه زمانی"
            options={SCOPE_FILTERS}
          />
        </FilterToolbar>

        {result.items.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={q || status || scope ? "نتیجه‌ای یافت نشد" : "هنوز رزروی ثبت نشده است"}
            description={
              q || status || scope
                ? "فیلترها را تغییر دهید یا عبارت دیگری جست‌وجو کنید."
                : "رزروهای ثبت‌شده از وب‌سایت در این بخش نمایش داده می‌شوند."
            }
            action={
              q || status || scope
                ? { label: "حذف فیلترها", href: ROUTES.admin.appointments }
                : undefined
            }
          />
        ) : (
          <>
            <DataTable
              caption="فهرست نوبت‌های ثبت‌شده"
              headers={[
                "کد رزرو",
                "متقاضی",
                "مشاور",
                "نوع جلسه",
                "تاریخ و ساعت",
                "برگزاری",
                "وضعیت",
                "",
              ]}
            >
              {result.items.map((appointment) => (
                <tr key={appointment.id} className="transition-colors hover:bg-paper-2/50">
                  <Td nowrap>
                    <span dir="ltr" className="font-semibold text-navy-900">
                      {appointment.bookingCode}
                    </span>
                  </Td>
                  <Td>
                    <span className="block font-medium text-navy-900">
                      {appointment.fullName}
                    </span>
                    <span dir="ltr" className="block text-[0.6875rem] text-muted-2">
                      {appointment.phone}
                    </span>
                  </Td>
                  <Td nowrap>{appointment.arbitratorName}</Td>
                  <Td nowrap>
                    {appointment.consultationTypeLabel || appointment.consultationType}
                  </Td>
                  <Td nowrap>
                    <span className="block text-navy-800">
                      {formatJalali(appointment.date)}
                    </span>
                    <span className="block text-[0.6875rem] text-muted-2 tabular-nums">
                      ساعت {fa(appointment.time)}
                    </span>
                  </Td>
                  <Td nowrap>{MEETING_MODE[appointment.meetingMode].label}</Td>
                  <Td nowrap>
                    <Badge
                      tone={APPOINTMENT_STATUS[appointment.status].tone}
                      dot
                      size="sm"
                    >
                      {APPOINTMENT_STATUS[appointment.status].label}
                    </Badge>
                  </Td>
                  <Td nowrap>
                    <RowActions>
                      {appointment.status === "pending" && (
                        <>
                          <QuickAction
                            action={updateAppointmentStatusAction}
                            csrfToken={csrfToken}
                            fields={{ id: appointment.id, status: "confirmed" }}
                            icon="check"
                            label="تأیید رزرو"
                            tone="success"
                          />
                          <QuickAction
                            action={updateAppointmentStatusAction}
                            csrfToken={csrfToken}
                            fields={{ id: appointment.id, status: "rejected" }}
                            icon="close"
                            label="رد رزرو"
                            tone="danger"
                          />
                        </>
                      )}
                      <IconAction
                        icon="eye"
                        label="مشاهده جزئیات"
                        href={ROUTES.admin.appointment(appointment.id)}
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
