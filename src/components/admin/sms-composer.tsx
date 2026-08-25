"use client";

import { useActionState, useMemo, useState } from "react";
import type { SmsLogEntry } from "@/types";
import { idleState, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { MAX_SMS_LENGTH, smsParts } from "@/lib/sms/constants";
import { formatJalaliDateTime } from "@/lib/utils/jalali";
import { fa } from "@/lib/utils/persian";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * "Send SMS" composer for a request or an appointment.
 *
 * The text is prefilled from the template configured for the record's current
 * status and is then fully editable — staff read and adjust the wording before
 * anything is sent. Nothing here fires automatically; the send is always a
 * deliberate press.
 *
 * The recipient is deliberately *not* a field. It is read from the stored
 * record inside the action, so nothing in this form can redirect a message
 * about somebody's case to another number.
 */

export function SmsComposer({
  action,
  id,
  csrfToken,
  recipient,
  defaultBody,
  history,
  ready,
  disabledReason,
}: {
  action: Action;
  id: string;
  csrfToken: string;
  /** Shown so staff can see where it is going; never submitted. */
  recipient: string;
  defaultBody: string;
  history: SmsLogEntry[];
  /** False when SMS is switched off or the provider key is absent. */
  ready: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );

  const [body, setBody] = useState(defaultBody);

  /**
   * Clear the box once a send succeeds, so the same message cannot be fired
   * twice by an accidental second click.
   *
   * Adjusted during render off the submission id rather than in an effect: an
   * effect would clear the field a frame *after* the success alert appears,
   * which is exactly the window in which a second click lands.
   */
  const [seenSubmission, setSeenSubmission] = useState(state.submissionId);
  if (state.submissionId !== seenSubmission) {
    setSeenSubmission(state.submissionId);
    if (state.status === "success") setBody("");
  }

  const parts = useMemo(() => smsParts(body.trim().length), [body]);
  const tooLong = body.length > MAX_SMS_LENGTH;

  return (
    <div className="flex flex-col gap-4">
      {!ready && (
        <Alert tone="warning">
          {disabledReason ??
            "ارسال پیامک پیکربندی نشده است. از «تنظیمات › پیامک» آن را فعال کنید."}
        </Alert>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        <input type="hidden" name="id" value={id} />

        {state.status !== "idle" && (
          <Alert tone={state.status === "success" ? "success" : "danger"}>
            {state.message}
          </Alert>
        )}

        <Field
          htmlFor={`sms-${id}`}
          label="متن پیامک"
          hint={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                گیرنده: <span dir="ltr">{recipient}</span>
              </span>
              <span className={tooLong ? "text-red-600" : undefined}>
                {fa(body.length)}/{fa(MAX_SMS_LENGTH)} نویسه
                {parts > 0 && ` — ${fa(parts)} پیامک`}
              </span>
            </span>
          }
          error={state.fieldErrors?.body}
        >
          <Textarea
            id={`sms-${id}`}
            name="body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={MAX_SMS_LENGTH}
            placeholder="متنی که برای متقاضی ارسال می‌شود…"
            invalid={tooLong}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon="mail"
            loading={pending}
            loadingText="در حال ارسال…"
            disabled={!ready || !body.trim() || tooLong}
          >
            ارسال پیامک
          </Button>

          {defaultBody && body !== defaultBody && (
            <button
              type="button"
              onClick={() => setBody(defaultBody)}
              className="text-[0.75rem] text-muted underline underline-offset-4 transition-colors hover:text-navy-900"
            >
              بازگردانی متن پیش‌فرض
            </button>
          )}
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
                <p className="mt-2 whitespace-pre-line text-[0.8125rem] leading-[1.9] text-ink-2">
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
