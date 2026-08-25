"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { idleState, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

export function LoginForm({
  csrfToken,
  next,
}: {
  csrfToken: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    idleState as FormState,
  );
  const [visible, setVisible] = useState(false);

  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      {next && <input type="hidden" name="next" value={next} />}

      {state.status === "error" && (
        <Alert tone="danger" title="ورود انجام نشد">
          {state.message}
        </Alert>
      )}

      <Field
        htmlFor="email"
        label="ایمیل"
        required
        error={fieldError("email")}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          ltr
          autoFocus
          placeholder="admin@dadavar-law.ir"
          invalid={Boolean(fieldError("email"))}
        />
      </Field>

      <Field
        htmlFor="password"
        label="رمز عبور"
        required
        error={fieldError("password")}
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            ltr
            placeholder="••••••••"
            className="pe-12"
            invalid={Boolean(fieldError("password"))}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
            className="absolute inset-y-0 start-0 flex w-12 items-center justify-center text-muted transition-colors hover:text-navy-800"
          >
            <Icon name={visible ? "close" : "eye"} size={17} />
          </button>
        </div>
      </Field>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        icon="lock"
        loading={pending}
        loadingText="در حال ورود…"
      >
        ورود به پنل
      </Button>

      <p className="flex items-start gap-2 text-[0.75rem] leading-[1.9] text-muted-2">
        <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-gold-600" />
        تلاش‌های ناموفق ورود محدود می‌شود. پس از چند تلاش ناموفق، دسترسی موقتاً
        مسدود خواهد شد.
      </p>
    </form>
  );
}
