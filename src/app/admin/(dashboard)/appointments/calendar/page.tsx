import type { Metadata } from "next";
import Link from "next/link";
import type { Appointment } from "@/types";
import { getSettings, listAppointments } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { ROUTES } from "@/lib/config/routes";
import { APPOINTMENT_STATUS, MEETING_MODE, WEEKDAYS } from "@/lib/config/labels";
import { iranWeekday } from "@/lib/services/scheduling";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import {
  formatJalali,
  formatJalaliShort,
  toISODateString,
} from "@/lib/utils/jalali";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AdminPageHeader, Panel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "تقویم نوبت‌ها" };

interface PageProps {
  searchParams: Promise<{ start?: string }>;
}

/** `YYYY-MM-DD` for a date offset by `days` from `from`. */
function shift(from: Date, days: number): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return toISODateString(date);
}

/**
 * Two-week schedule board.
 *
 * A month grid looks impressive and is close to useless at this scale: a legal
 * practice needs to see who is coming and when, which a dense fortnight of
 * actual bookings shows far better than 30 mostly-empty cells. Closed days and
 * blocked dates are drawn too, so a gap reads as "we are shut" rather than
 * "nobody booked".
 */
export default async function AppointmentCalendarPage({ searchParams }: PageProps) {
  await requireAdminSession("operations");

  const { start } = await searchParams;

  const today = new Date();
  const anchor = start && /^\d{4}-\d{2}-\d{2}$/.test(start)
    ? new Date(`${start}T00:00:00`)
    : today;

  const days = Array.from({ length: 14 }, (_, index) => shift(anchor, index));
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  const [settings, result] = await Promise.all([
    getSettings(),
    listAppointments({ pageSize: 500 }),
  ]);

  const inRange = result.items.filter(
    (appointment) =>
      appointment.date >= rangeStart && appointment.date <= rangeEnd,
  );

  const byDate = inRange.reduce<Record<string, Appointment[]>>((acc, item) => {
    (acc[item.date] ??= []).push(item);
    return acc;
  }, {});

  for (const list of Object.values(byDate)) {
    list.sort((a, b) => a.time.localeCompare(b.time));
  }

  const { appointments: rules } = settings;
  const todayIso = toISODateString(today);

  const isClosed = (iso: string) => {
    if (rules.blockedDates.includes(iso)) return true;
    const day = rules.days.find((entry) => entry.day === iranWeekday(iso));
    return !day || !day.enabled;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="تقویم نوبت‌ها"
        description={`${formatJalali(rangeStart)} تا ${formatJalali(rangeEnd)}`}
        actions={
          <>
            <ButtonLink
              href={`${ROUTES.admin.appointmentCalendar}?start=${shift(anchor, -14)}`}
              variant="outline"
              size="sm"
              icon="chevron-end"
            >
              دو هفته قبل
            </ButtonLink>
            <ButtonLink
              href={ROUTES.admin.appointmentCalendar}
              variant="outline"
              size="sm"
            >
              امروز
            </ButtonLink>
            <ButtonLink
              href={`${ROUTES.admin.appointmentCalendar}?start=${shift(anchor, 14)}`}
              variant="outline"
              size="sm"
              icon="chevron-start"
            >
              دو هفته بعد
            </ButtonLink>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sm border border-line bg-white px-4 py-3 text-[0.75rem] text-muted">
        <span className="flex items-center gap-1.5">
          <Icon name="calendar" size={14} className="text-gold-600" />
          {fa(inRange.length)} رزرو در این بازه
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-success" />
          تأیید شده
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-warning" />
          در انتظار تأیید
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-line-2" />
          روز تعطیل
        </span>
      </div>

      <Panel bodyClassName="p-0">
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-7">
          {days.map((iso) => {
            const items = byDate[iso] ?? [];
            const closed = isClosed(iso);
            const isToday = iso === todayIso;

            return (
              <div
                key={iso}
                className={cn(
                  "flex min-h-[9rem] flex-col bg-white p-3",
                  closed && "bg-paper-2/60",
                  isToday && "ring-1 ring-inset ring-navy-900",
                )}
              >
                <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-line pb-2">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "text-[0.8125rem] font-bold",
                        isToday ? "text-navy-950" : "text-navy-800",
                      )}
                    >
                      {WEEKDAYS[iranWeekday(iso)]}
                    </span>
                    <span className="text-[0.6875rem] text-muted-2 tabular-nums">
                      {formatJalaliShort(iso)}
                    </span>
                  </span>

                  {isToday && (
                    <span className="rounded-xs bg-navy-900 px-1.5 py-0.5 text-[0.5625rem] font-bold text-white">
                      امروز
                    </span>
                  )}
                </div>

                {closed && items.length === 0 ? (
                  <p className="my-auto text-center text-[0.6875rem] text-muted-2">
                    تعطیل
                  </p>
                ) : items.length === 0 ? (
                  <p className="my-auto text-center text-[0.6875rem] text-muted-2">
                    بدون رزرو
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {items.map((appointment) => {
                      const status = APPOINTMENT_STATUS[appointment.status];
                      return (
                        <li key={appointment.id}>
                          <Link
                            href={ROUTES.admin.appointment(appointment.id)}
                            className={cn(
                              "block rounded-xs border-s-2 bg-paper-2/60 px-2 py-1.5 transition-colors hover:bg-paper-2",
                              status.tone === "success" && "border-success",
                              status.tone === "warning" && "border-warning",
                              status.tone === "danger" && "border-danger",
                              status.tone === "info" && "border-info",
                              status.tone === "neutral" && "border-line-2",
                            )}
                          >
                            <span className="flex items-baseline justify-between gap-2">
                              <span
                                dir="ltr"
                                className="text-[0.6875rem] font-bold text-navy-900 tabular-nums"
                              >
                                {fa(appointment.time)}
                              </span>
                              <span className="text-[0.5625rem] text-muted-2">
                                {MEETING_MODE[appointment.meetingMode].label}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[0.6875rem] text-ink-2">
                              {appointment.fullName}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
