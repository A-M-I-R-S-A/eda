import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { RequestStatus } from "@/types";
import {
  getArbitratorById,
  getRequestById,
  getSettings,
  listSmsForEntity,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  CALL_WINDOW,
  CONTACT_METHOD,
  REQUEST_STATUS,
  REQUEST_TYPE,
} from "@/lib/config/labels";
import { getCsrfToken } from "@/lib/security/csrf";
import { formatFileSize } from "@/lib/security/upload";
import { formatJalali, formatJalaliDateTime } from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import {
  addRequestNoteAction,
  updateRequestStatusAction,
} from "@/lib/actions/admin";
import { sendRequestSmsAction } from "@/lib/actions/sms";
import { statusUpdateBlockedReason } from "@/lib/sms/service";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { NoteComposer, StatusChanger } from "@/components/admin/actions";
import { SmsComposer } from "@/components/admin/sms-composer";
import { AdminPageHeader, Panel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "جزئیات درخواست" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_OPTIONS = (Object.keys(REQUEST_STATUS) as RequestStatus[]).map(
  (status) => ({ value: status, label: REQUEST_STATUS[status].label }),
);

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-[0.8125rem]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-start font-medium text-navy-900">{value}</dd>
    </div>
  );
}

export default async function AdminRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const request = await getRequestById(id);

  if (!request) notFound();

  const [csrfToken, assigned, settings, smsHistory, smsBlocked] = await Promise.all([
    getCsrfToken(),
    request.assignedArbitratorId
      ? getArbitratorById(request.assignedArbitratorId)
      : Promise.resolve(null),
    getSettings(),
    listSmsForEntity(request.id),
    statusUpdateBlockedReason(),
  ]);



  const status = REQUEST_STATUS[request.status];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.requests}
        title={request.subject}
        description={`کد پیگیری ${request.trackingCode} — ثبت‌شده در ${formatJalali(request.createdAt)}`}
        actions={
          <Badge tone={status.tone} dot size="md">
            {status.label}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* -- main ---------------------------------------------------------- */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="شرح موضوع">
            <p className="whitespace-pre-line text-[0.9375rem] leading-[2.1] text-ink-2">
              {request.description}
            </p>
          </Panel>

          <Panel
            title="فایل‌های پیوست"
            description={
              request.attachments.length
                ? `${fa(request.attachments.length)} فایل — دریافت تنها برای کاربران مجاز`
                : undefined
            }
            bodyClassName={request.attachments.length ? "p-0" : "p-5"}
          >
            {request.attachments.length === 0 ? (
              <p className="text-[0.875rem] text-muted">
                متقاضی فایلی پیوست نکرده است.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {request.attachments.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <Icon name="document" size={18} className="shrink-0 text-navy-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-medium text-navy-900">
                        {file.originalName}
                      </span>
                      <span className="block text-[0.6875rem] text-muted-2">
                        {formatFileSize(file.size)} — بارگذاری در{" "}
                        {formatJalali(file.uploadedAt)}
                      </span>
                    </span>
                    <a
                      href={`/api/admin/attachments/${file.storedName}`}
                      download={file.originalName}
                      className="flex h-9 shrink-0 items-center gap-2 rounded-sm border border-line-2 px-3 text-[0.75rem] font-medium text-navy-800 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white"
                    >
                      <Icon name="download" size={15} />
                      دریافت
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="یادداشت‌های داخلی" bodyClassName="p-0">
            {request.notes.length > 0 && (
              <ul className="divide-y divide-line">
                {[...request.notes].reverse().map((note) => (
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
                action={addRequestNoteAction}
                id={request.id}
                csrfToken={csrfToken}
              />
            </div>
          </Panel>

          <Panel title="سوابق وضعیت" bodyClassName="p-5">
            <ol className="relative">
              <span
                aria-hidden="true"
                className="absolute inset-y-2 start-[0.5rem] w-px bg-line"
              />
              {[...request.timeline].reverse().map((event, index) => (
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
                      {REQUEST_STATUS[event.status as RequestStatus]?.label ??
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

        {/* -- sidebar ------------------------------------------------------- */}
        <div className="flex flex-col gap-6">
          <Panel title="مدیریت وضعیت">
            <StatusChanger
              action={updateRequestStatusAction}
              id={request.id}
              csrfToken={csrfToken}
              currentStatus={request.status}
              options={STATUS_OPTIONS}
            />
          </Panel>

          <Panel
            title="ارسال پیامک به متقاضی"
            description="پیامک از قالب تعریف‌شده در sms.ir ارسال می‌شود و تنها کد پیگیری به آن داده می‌شود."
          >
            <SmsComposer
              action={sendRequestSmsAction}
              id={request.id}
              csrfToken={csrfToken}
              recipient={request.phone}
              code={request.trackingCode}
              templateId={settings.sms.updateTemplateId}
              history={smsHistory}
              blockedReason={smsBlocked}
            />
          </Panel>

          <Panel title="اطلاعات متقاضی">
            <dl className="divide-y divide-line">
              <Detail label="نام و نام خانوادگی" value={request.fullName} />
              <Detail
                label="شماره موبایل"
                value={
                  <a href={`tel:${request.phone}`} dir="ltr" className="hover:underline">
                    {request.phone}
                  </a>
                }
              />
              <Detail
                label="ایمیل"
                value={
                  request.email ? (
                    <a
                      href={`mailto:${request.email}`}
                      dir="ltr"
                      className="hover:underline"
                    >
                      {request.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Detail
                label="روش تماس ترجیحی"
                value={CONTACT_METHOD[request.preferredContact]}
              />
              <Detail
                label="زمان مناسب تماس"
                value={CALL_WINDOW[request.preferredWindow]}
              />
            </dl>
          </Panel>

          <Panel title="مشخصات پرونده">
            <dl className="divide-y divide-line">
              <Detail
                label="نوع درخواست"
                value={REQUEST_TYPE[request.requestType]}
              />
              <Detail label="حوزه حقوقی" value={request.legalArea} />
              <Detail
                label="داور ارجاعی"
                value={assigned ? assigned.fullName : "تعیین نشده"}
              />
              <Detail
                label="پذیرش سیاست حریم خصوصی"
                value={request.consentAccepted ? "بله" : "خیر"}
              />
              <Detail
                label="آخرین به‌روزرسانی"
                value={formatJalaliDateTime(request.updatedAt)}
              />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
