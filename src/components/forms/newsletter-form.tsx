"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { subscribeNewsletterAction } from "@/lib/actions/public";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Newsletter sign-up.
 *
 * One field, because every extra one costs sign-ups and none of them are
 * needed to send an email. The response is deliberately identical whether the
 * address was new or already subscribed — see the action for why.
 */
export function NewsletterForm({
  csrfToken,
  source = "footer",
  onDark = false,
  className,
}: {
  csrfToken: string;
  source?: string;
  onDark?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    subscribeNewsletterAction,
    idleState as FormState,
  );
  const [email, setEmail] = useState("");

  // Clear the field on a *new* successful submission. Derived during render so
  // no effect is needed for what is really "reset on result change".
  const [lastSubmission, setLastSubmission] = useState(state.submissionId);
  if (state.submissionId !== lastSubmission) {
    setLastSubmission(state.submissionId);
    if (state.status === "success") setEmail("");
  }

  const error = state.fieldErrors?.email?.[0] ?? (state.status === "error" ? state.message : null);

  return (
    <form action={formAction} className={cn("flex flex-col gap-2.5", className)}>
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="source" value={source} />

      <div className="flex gap-2">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          نشانی ایمیل برای دریافت خبرنامه
        </label>
        <input
          id={`newsletter-${source}`}
          name="email"
          type="email"
          required
          dir="ltr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@mail.com"
          aria-invalid={Boolean(error) || undefined}
          className={cn(
            "min-h-11 min-w-0 flex-1 rounded-sm border px-3.5 text-start text-[0.875rem]",
            "transition-colors focus:outline-none focus:ring-[3px]",
            onDark
              ? "border-white/15 bg-white/[0.06] text-white placeholder:text-white/35 focus:border-gold-400/60 focus:ring-white/10"
              : "border-line-2 bg-white text-ink placeholder:text-muted-2/80 focus:border-navy-600 focus:ring-navy-900/[0.07]",
            error && "border-danger/60",
          )}
        />

        <Button
          type="submit"
          variant={onDark ? "accent" : "primary"}
          size="md"
          loading={pending}
          loadingText="…"
          className="shrink-0"
        >
          عضویت
        </Button>
      </div>

      {state.status === "success" ? (
        <p
          role="status"
          className={cn(
            "flex items-start gap-1.5 text-[0.75rem] leading-[1.9]",
            onDark ? "text-gold-200" : "text-success",
          )}
        >
          <Icon name="check-circle" size={14} className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : error ? (
        <p
          role="alert"
          className={cn(
            "flex items-start gap-1.5 text-[0.75rem] leading-[1.9]",
            onDark ? "text-danger/90" : "text-danger",
          )}
        >
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        <p
          className={cn(
            "text-[0.75rem] leading-[1.9]",
            onDark ? "text-white/45" : "text-muted",
          )}
        >
          نشانی شما تنها برای ارسال مطالب مؤسسه استفاده می‌شود و در اختیار
          دیگری قرار نمی‌گیرد.
        </p>
      )}
    </form>
  );
}
