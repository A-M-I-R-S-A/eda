"use client";

import { useActionState } from "react";
import type { SmsLogEntry } from "@/types";
import { idleState, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { formatJalaliDateTime } from "@/lib/utils/jalali";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * "Notify the client" panel for a request or an appointment.
 *
 * Deliberately not a message composer. sms.ir delivers transactional messages
 * through templates registered and approved in its own panel, and the API
 * supplies only parameter values — so there is no body to write here, and a
 * textarea would promise an ability the account does not have.
 *
 * What staff confirm instead is *what will be sent*: which template, to which
 * number, carrying which code. Both the recipient and the code are read from
 * the stored record inside the action, so nothing on this screen can redirect
 * a case notification or misreport a code.
 */
export function SmsComposer({
  action,
  id,
  csrfToken,
  recipient,
  code,
  templateId,
  history,
  blockedReason,
}: {
  action: Action;
  id: string;
  csrfToken: string;
  /** Shown so staff can see where it is going; never submitted. */
  recipient: string;
  /** Tracking code for a request, booking code for an appointment. */
  code: string;
  /** The configured sms.ir template, for confirmation. */
  templateId: string;
  history: SmsLogEntry[];
  /** Why sending is unavailable, or `null` when it is ready. */
  blockedReason: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );

  const ready = blockedReason === null;

  return (
    <div className="flex flex-col gap-4">
      {!ready && <Alert tone="warning">{blockedReason}</Alert>}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        <input type="hidden" name="id" value={id} />

        {state.status !== "idle" && (
          <Alert tone={state.status === "success" ? "success" : "danger"}>
            {state.message}
          </Alert>
        )}

        <dl className="divide-y divide-line rounded-sm border border-line bg-paper-2/40 px-4">
          <div className="flex items-baseline justify-between gap-4 py-2.5 text-[0.8125rem]">
            <dt className="text-muted">گیرنده</dt>
            <dd dir="ltr" className="font-medium text-navy-900">
              {recipient}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5 text-[0.8125rem]">
            <dt className="text-muted">کد ارسالی</dt>
            <dd dir="ltr" className="font-medium text-navy-900">
              {code}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5 text-[0.8125rem]">
            <dt className="text-muted">قالب پیامک</dt>
            <dd dir="ltr" className="font-medium text-navy-900">
              {templateId || "—"}
            </dd>
          </div>
        </dl>

        <p className="text-[0.8125rem] leading-[1.9] text-muted">
          متن پیامک در پنل sms.ir تعریف شده است و از اینجا قابل تغییر نیست؛ تنها
          کد بالا به قالب ارسال می‌شود.
        </p>

        <div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon="mail"
            loading={pending}
            loadingText="در حال ارسال…"
            disabled={!ready}
          >
            ارسال پیامک به‌روزرسانی
          </Button>
        </div>
      </form>

      {history.length > 0 && (
        <div className="border-t border-line pt-4">
          <h3 className="text-[0.8125rem] font-semibold text-navy-900">
            پیامک‌های ارسال‌شده
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-sm border border-line bg-paper-2/40 p-3"
              >
                <div className="flex items-center justify-between gap-3 text-[0.6875rem] text-muted-2">
                  <span className="flex items-center gap-1.5">
                    <Icon
                      name={entry.status === "sent" ? "check" : "close"}
                      size={13}
                      className={
                        entry.status === "sent"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    />
                    {entry.sentByName ?? "سیستم"}
                  </span>
                  <span>{formatJalaliDateTime(entry.createdAt)}</span>
                </div>
                <p
                  dir="ltr"
                  className="mt-2 text-start text-[0.75rem] leading-[1.8] text-ink-2"
                >
                  {entry.body}
                </p>
                {entry.status === "failed" && entry.error && (
                  <p className="mt-2 text-[0.6875rem] text-red-600">
                    خطا: {entry.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
