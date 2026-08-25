import type { Appointment, ConsultationRequest } from "@/types";
import { cn } from "@/lib/utils/cn";
import {
  APPOINTMENT_STATUS,
  MEETING_MODE,
  REQUEST_STATUS,
  REQUEST_STATUS_ORDER,
  REQUEST_TYPE,
} from "@/lib/config/labels";
import { formatJalali, formatJalaliDateTime, formatJalaliLong } from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

/**
 * Case status view.
 *
 * Two layers: a *rail* of the canonical happy-path stages (so the visitor can
 * see where they are in the overall journey) and the *event log* of what
 * actually happened, with dates. Terminal states that leave the happy path
 * (cancelled, needs-info) are surfaced as a banner rather than being forced
 * into the rail.
 */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 text-[0.875rem]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-start font-medium text-navy-900">{value}</dd>
    </div>
  );
}

function EventLog({
  events,
  resolve,
}: {
  events: { status: string; at: string; note?: string; byName?: string }[];
  resolve: (status: string) => { label: string; tone: string } | undefined;
}) {
  const ordered = [...events].reverse();

  return (
    <ol className="relative">
      <span
        aria-hidden="true"
        className="absolute inset-y-2 start-[0.5625rem] w-px bg-line"
      />
      {ordered.map((event, index) => (
        <li key={`${event.status}-${event.at}`} className="relative flex gap-5 pb-6 ps-8 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 start-0 flex items-start pt-1"
          >
            <span
              className={cn(
                "size-[1.125rem] rounded-full border-2 bg-paper",
                index === 0 ? "border-gold-400" : "border-line-2",
              )}
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-semibold text-navy-900">
              {resolve(event.status)?.label ?? event.status}
            </p>
            <p className="mt-1 text-[0.8125rem] text-muted-2">
              {formatJalaliDateTime(event.at)}
              {event.byName && ` — ${event.byName}`}
            </p>
            {event.note && (
              <p className="mt-2 rounded-sm bg-paper-2 px-3.5 py-2.5 text-[0.8125rem] leading-[1.95] text-ink-2">
                {event.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/*  Consultation request                                                      */
/* -------------------------------------------------------------------------- */

export function RequestStatusView({ request }: { request: ConsultationRequest }) {
  const current = REQUEST_STATUS[request.status];
  const railIndex = REQUEST_STATUS_ORDER.indexOf(request.status);
  const offRail = railIndex === -1;

  return (
    <div className="flex flex-col gap-8">
      {/* header */}
      <div className="surface p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[0.8125rem] text-muted">کد پیگیری</p>
            <div className="mt-2 flex items-center gap-3">
              <p dir="ltr" className="text-[1.5rem] font-bold tracking-[0.06em] text-navy-950">
                {request.trackingCode}
              </p>
              <CopyButton value={request.trackingCode} />
            </div>
          </div>

          <Badge tone={current.tone} dot size="md">
            {current.label}
          </Badge>
        </div>

        <p className="mt-5 rounded-sm bg-paper-2 px-4 py-3.5 text-[0.875rem] leading-[2] text-ink-2">
          {current.description}
        </p>

        <dl className="mt-6 divide-y divide-line border-t border-line">
          <DetailRow label="نوع درخواست" value={REQUEST_TYPE[request.requestType]} />
          <DetailRow label="حوزه حقوقی" value={request.legalArea} />
          <DetailRow label="موضوع" value={request.subject} />
          <DetailRow label="تاریخ ثبت" value={formatJalali(request.createdAt)} />
          <DetailRow
            label="آخرین به‌روزرسانی"
            value={formatJalali(request.updatedAt)}
          />
          <DetailRow
            label="فایل‌های پیوست"
            value={
              request.attachments.length
                ? `${fa(request.attachments.length)} فایل`
                : "بدون پیوست"
            }
          />
        </dl>
      </div>

      {request.status === "needs-info" && (
        <Alert tone="warning" title="نیازمند اطلاعات بیشتر">
          برای ادامه بررسی، ارائه مدارک یا توضیحات تکمیلی لازم است. لطفاً با
          دبیرخانه مؤسسه تماس بگیرید.
        </Alert>
      )}

      {request.status === "cancelled" && (
        <Alert tone="danger" title="این درخواست لغو شده است">
          در صورت نیاز به پیگیری مجدد، لطفاً درخواست تازه‌ای ثبت کنید.
        </Alert>
      )}

      {/* rail */}
      {!offRail && (
        <div className="surface p-6 lg:p-8">
          <h3 className="text-[1.0625rem] font-bold text-navy-900">
            مراحل رسیدگی
          </h3>

          <ol className="mt-7 flex flex-col gap-0 md:flex-row md:items-start">
            {REQUEST_STATUS_ORDER.map((status, index) => {
              const done = index < railIndex;
              const active = index === railIndex;

              return (
                <li
                  key={status}
                  className="flex min-w-0 flex-1 gap-4 pb-6 last:pb-0 md:flex-col md:items-center md:gap-3 md:pb-0"
                >
                  <div className="flex flex-col items-center md:w-full md:flex-row">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full border text-[0.8125rem] font-semibold tabular-nums transition-colors",
                        active
                          ? "border-navy-900 bg-navy-900 text-white"
                          : done
                            ? "border-success bg-success-soft text-success"
                            : "border-line-2 bg-white text-muted-2",
                      )}
                    >
                      {done ? <Icon name="check" size={16} weight={2.5} /> : fa(index + 1)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "w-px flex-1 md:h-px md:w-auto",
                        index === REQUEST_STATUS_ORDER.length - 1 && "md:hidden",
                        done ? "bg-success/40" : "bg-line",
                        "my-1 md:my-0 md:ms-2",
                      )}
                    />
                  </div>

                  <span
                    className={cn(
                      "pt-1.5 text-[0.8125rem] md:pt-0 md:text-center",
                      active
                        ? "font-semibold text-navy-900"
                        : done
                          ? "text-ink-2"
                          : "text-muted-2",
                    )}
                  >
                    {REQUEST_STATUS[status].label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* log */}
      <div className="surface p-6 lg:p-8">
        <h3 className="text-[1.0625rem] font-bold text-navy-900">
          سوابق وضعیت
        </h3>
        <div className="mt-7">
          <EventLog
            events={request.timeline}
            resolve={(status) =>
              REQUEST_STATUS[status as keyof typeof REQUEST_STATUS]
            }
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Appointment                                                               */
/* -------------------------------------------------------------------------- */

export function AppointmentStatusView({
  appointment,
}: {
  appointment: Appointment;
}) {
  const current = APPOINTMENT_STATUS[appointment.status];

  return (
    <div className="flex flex-col gap-8">
      <div className="surface p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[0.8125rem] text-muted">کد رزرو</p>
            <div className="mt-2 flex items-center gap-3">
              <p dir="ltr" className="text-[1.5rem] font-bold tracking-[0.06em] text-navy-950">
                {appointment.bookingCode}
              </p>
              <CopyButton value={appointment.bookingCode} />
            </div>
          </div>

          <Badge tone={current.tone} dot size="md">
            {current.label}
          </Badge>
        </div>

        <p className="mt-5 rounded-sm bg-paper-2 px-4 py-3.5 text-[0.875rem] leading-[2] text-ink-2">
          {current.description}
        </p>

        <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
          <div className="bg-white px-4 py-4">
            <p className="text-[0.75rem] text-muted">تاریخ</p>
            <p className="mt-1 text-[0.9375rem] font-semibold text-navy-900">
              {formatJalaliLong(appointment.date)}
            </p>
          </div>
          <div className="bg-white px-4 py-4">
            <p className="text-[0.75rem] text-muted">ساعت</p>
            <p className="mt-1 text-[0.9375rem] font-semibold text-navy-900 tabular-nums">
              {fa(appointment.time)}
            </p>
          </div>
          <div className="bg-white px-4 py-4">
            <p className="text-[0.75rem] text-muted">مدت</p>
            <p className="mt-1 text-[0.9375rem] font-semibold text-navy-900">
              {fa(appointment.durationMinutes)} دقیقه
            </p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-line border-t border-line">
          <DetailRow label="نوع جلسه" value={appointment.consultationTypeLabel || appointment.consultationType} />
          <DetailRow
            label="نحوه برگزاری"
            value={MEETING_MODE[appointment.meetingMode].label}
          />
          <DetailRow label="نام مشاور" value={appointment.arbitratorName} />
          <DetailRow label="موضوع" value={appointment.subject} />
          <DetailRow label="تاریخ ثبت" value={formatJalali(appointment.createdAt)} />
        </dl>
      </div>

      {appointment.status === "pending" && (
        <Alert tone="info" title="در انتظار تأیید">
          رزرو شما ثبت شده و در نوبت بررسی است. تأیید نهایی از طریق تماس یا پیامک
          اعلام می‌شود.
        </Alert>
      )}

      {(appointment.status === "cancelled" || appointment.status === "rejected") && (
        <Alert tone="danger" title="این رزرو فعال نیست">
          برای تعیین وقت جدید، لطفاً دوباره اقدام کنید یا با دبیرخانه تماس بگیرید.
        </Alert>
      )}

      <div className="surface p-6 lg:p-8">
        <h3 className="text-[1.0625rem] font-bold text-navy-900">سوابق وضعیت</h3>
        <div className="mt-7">
          <EventLog
            events={appointment.timeline}
            resolve={(status) =>
              APPOINTMENT_STATUS[status as keyof typeof APPOINTMENT_STATUS]
            }
          />
        </div>
      </div>
    </div>
  );
}
