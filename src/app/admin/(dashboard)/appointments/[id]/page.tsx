import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { AppointmentStatus } from "@/types";
import {
  getAppointmentById,
  getSettings,
  listSmsForEntity,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  APPOINTMENT_STATUS,
  MEETING_MODE,
} from "@/lib/config/labels";
import { getCsrfToken } from "@/lib/security/csrf";
import {
  addAppointmentNoteAction,
  rescheduleAppointmentAction,
  updateAppointmentStatusAction,
} from "@/lib/actions/admin";
import { sendAppointmentSmsAction } from "@/lib/actions/sms";
import { statusUpdateBlockedReason } from "@/lib/sms/service";
import {
  formatJalali,
  formatJalaliDateTime,
  formatJalaliLong,
} from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import {
  NoteComposer,
  RescheduleForm,
  StatusChanger,
} from "@/components/admin/actions";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { SmsComposer } from "@/components/admin/sms-composer";

export const metadata: Metadata = { title: "جزئیات نوبت" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_OPTIONS = (
  Object.keys(APPOINTMENT_STATUS) as AppointmentStatus[]
).map((status) => ({ value: status, label: APPOINTMENT_STATUS[status].label }));

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-[0.8125rem]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-start font-medium text-navy-900">{value}</dd>
    </div>
  );
}

export default async function AdminAppointmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const appointment = await getAppointmentById(id);

  if (!appointment) notFound();

  const [csrfToken, settings, smsHistory, smsBlocked] = await Promise.all([
    getCsrfToken(),
    getSettings(),
    listSmsForEntity(appointment.id),
    statusUpdateBlockedReason(),
  ]);

  const status = APPOINTMENT_STATUS[appointment.status];
  

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.appointments}
        title={`رزرو ${appointment.bookingCode}`}
        description={`${appointment.consultationTypeLabel || appointment.consultationType} — ${formatJalaliLong(appointment.date)} ساعت ${fa(appointment.time)}`}
        actions={
          <Badge tone={status.tone} dot size="md">
            {status.label}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="مشخصات جلسه" bodyClassName="p-0">
            <div className="grid gap-px bg-line sm:grid-cols-3">
              <div className="bg-white px-5 py-4">
                <p className="text-[0.6875rem] text-muted">تاریخ</p>
                <p className="mt-1 text-[0.9375rem] font-semibold text-navy-900">
                  {formatJalali(appointment.date)}
                </p>
              </div>
              <div className="bg-white px-5 py-4">
                <p className="text-[0.6875rem] text-muted">ساعت</p>
                <p className="mt-1 text-[0.9375rem] font-semibold text-navy-900 tabular-nums">
                  {fa(appointment.time)}
                </p>
              </div>
              <div className="bg-white px-5 py-4">
                <p className="text-[0.6875rem] text-muted">مدت</p>
                <p className="mt-1 text-[0.9375rem] font-semibold text-navy-900">
                  {fa(appointment.durationMinutes)} دقیقه
                </p>
              </div>
            </div>

            <div className="border-t border-line p-5">
              <p className="text-[0.6875rem] text-muted">موضوع جلسه</p>
              <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-[2.1] text-ink-2">
                {appointment.subject}
              </p>
            </div>
          </Panel>

          <Panel
            title="زمان‌بندی مجدد"
            description="پس از تغییر زمان، وضعیت رزرو به «زمان‌بندی مجدد» تغییر می‌کند."
          >
            <RescheduleForm
              action={rescheduleAppointmentAction}
              csrfToken={csrfToken}
              id={appointment.id}
              date={appointment.date}
              time={appointment.time}
            />
          </Panel>

          <Panel title="یادداشت‌های داخلی" bodyClassName="p-0">
            {appointment.notes.length > 0 && (
              <ul className="divide-y divide-line">
                {[...appointment.notes].reverse().map((note) => (
                  <li key={note.id} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[0.8125rem] font-semibold text-navy-900">
                        {note.authorName}
                      </p>
                      <p className="text-[0.6875rem] text-muted-2">
                        {formatJalaliDateTime(note.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-[0.8125rem] leading-[1.95] text-ink-2">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-line p-5 first:border-t-0">
              <NoteComposer
                action={addAppointmentNoteAction}
                id={appointment.id}
                csrfToken={csrfToken}
              />
            </div>
          </Panel>

          <Panel title="سوابق وضعیت">
            <ol className="relative">
              <span
                aria-hidden="true"
                className="absolute inset-y-2 start-[0.5rem] w-px bg-line"
              />
              {[...appointment.timeline].reverse().map((event, index) => (
                <li
                  key={`${event.status}-${event.at}`}
                  className="relative flex gap-4 pb-5 ps-7 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 start-0 flex items-start pt-1"
                  >
                    <span
                      className={`size-4 rounded-full border-2 bg-white ${
                        index === 0 ? "border-gold-400" : "border-line-2"
                      }`}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] font-semibold text-navy-900">
                      {APPOINTMENT_STATUS[event.status as AppointmentStatus]?.label ??
                        event.status}
                    </p>
                    <p className="mt-0.5 text-[0.6875rem] text-muted-2">
                      {formatJalaliDateTime(event.at)}
                      {event.byName && ` — ${event.byName}`}
                    </p>
                    {event.note && (
                      <p className="mt-2 rounded-sm bg-paper-2 px-3 py-2 text-[0.75rem] leading-[1.9] text-ink-2">
                        {event.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="مدیریت وضعیت">
            <StatusChanger
              action={updateAppointmentStatusAction}
              id={appointment.id}
              csrfToken={csrfToken}
              currentStatus={appointment.status}
              options={STATUS_OPTIONS}
              noteLabel="توضیح (اختیاری)"
              notePlaceholder="مثلاً: به درخواست متقاضی لغو شد."
            />
          </Panel>

          <Panel
            title="ارسال پیامک به متقاضی"
            description="پیامک از قالب تعریف‌شده در sms.ir ارسال می‌شود و تنها کد رزرو به آن داده می‌شود."
          >
            <SmsComposer
              action={sendAppointmentSmsAction}
              id={appointment.id}
              csrfToken={csrfToken}
              recipient={appointment.phone}
              code={appointment.bookingCode}
              templateId={settings.sms.updateTemplateId}
              history={smsHistory}
              blockedReason={smsBlocked}
            />
          </Panel>

          <Panel title="اطلاعات متقاضی">
            <dl className="divide-y divide-line">
              <Detail label="نام و نام خانوادگی" value={appointment.fullName} />
              <Detail
                label="شماره موبایل"
                value={
                  <a href={`tel:${appointment.phone}`} dir="ltr" className="hover:underline">
                    {appointment.phone}
                  </a>
                }
              />
              <Detail
                label="ایمیل"
                value={
                  appointment.email ? (
                    <a
                      href={`mailto:${appointment.email}`}
                      dir="ltr"
                      className="hover:underline"
                    >
                      {appointment.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </Panel>

          <Panel title="مشخصات رزرو">
            <dl className="divide-y divide-line">
              <Detail label="نوع مشاوره" value={appointment.consultationTypeLabel || appointment.consultationType} />
              <Detail
                label="نحوه برگزاری"
                value={MEETING_MODE[appointment.meetingMode].label}
              />
              <Detail label="مشاور" value={appointment.arbitratorName} />
              <Detail
                label="تاریخ ثبت"
                value={formatJalaliDateTime(appointment.createdAt)}
              />
              <Detail
                label="آخرین به‌روزرسانی"
                value={formatJalaliDateTime(appointment.updatedAt)}
              />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
