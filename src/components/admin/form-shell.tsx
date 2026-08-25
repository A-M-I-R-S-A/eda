"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { idleState, type FormState } from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { slugify } from "@/lib/utils/slug";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Wrapper shared by every admin content form.
 *
 * Owns the action state, the outcome banner and the sticky save bar so the
 * individual entity forms only describe their fields. `render` receives an
 * `error(name)` helper wired to the server's field errors, which keeps client
 * and server validation messages in the same place.
 */
export function FormShell({
  action,
  csrfToken,
  id,
  submitLabel,
  cancelHref,
  successRedirect,
  children,
}: {
  action: Action;
  csrfToken: string;
  id?: string;
  submitLabel: string;
  cancelHref: string;
  /** Navigated to after a successful save. */
  successRedirect?: string;
  children: (helpers: {
    error: (name: string) => string[] | undefined;
  }) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    idleState as FormState,
  );
  const router = useRouter();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "idle") return;
    bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (state.status === "success" && successRedirect) {
      const timer = setTimeout(() => router.push(successRedirect), 900);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.submissionId, successRedirect, router]);

  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6 pb-24">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      {id && <input type="hidden" name="id" value={id} />}

      {state.status !== "idle" && (
        <div ref={bannerRef}>
          <Alert
            tone={state.status === "success" ? "success" : "danger"}
            title={state.status === "success" ? "انجام شد" : "ذخیره‌سازی انجام نشد"}
          >
            {state.message}
          </Alert>
        </div>
      )}

      {children({ error })}

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <p className="hidden items-center gap-2 text-[0.75rem] text-muted sm:flex">
            <Icon name="info" size={14} className="text-gold-600" />
            تغییرات پس از ذخیره بلافاصله در وب‌سایت اعمال می‌شود.
          </p>

          <div className="flex flex-1 items-center justify-end gap-2.5">
            <ButtonLink href={cancelHref} variant="ghost" size="md">
              انصراف
            </ButtonLink>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={pending}
              loadingText="در حال ذخیره…"
              className="min-w-[9rem]"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Slug field                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Slug input with a "generate from title" button.
 *
 * Persian titles are transliterated to ASCII by `slugify`, which produces
 * cleaner, more shareable URLs than percent-encoded Persian.
 */
export function SlugField({
  name = "slug",
  defaultValue = "",
  sourceId,
  error,
  hint = "نشانی صفحه در وب‌سایت. تنها حروف لاتین، اعداد و خط تیره.",
}: {
  name?: string;
  defaultValue?: string;
  /** id of the input to transliterate from. */
  sourceId: string;
  error?: string[];
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  const generate = () => {
    const source = document.getElementById(sourceId) as HTMLInputElement | null;
    if (source?.value) setValue(slugify(source.value));
  };

  return (
    <Field htmlFor={name} label="نامک (Slug)" required hint={hint} error={error}>
      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          ltr
          placeholder="example-page-slug"
          invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={generate}
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 rounded-sm border border-line-2 px-4",
            "text-[0.8125rem] font-medium text-navy-800 transition-colors",
            "hover:border-navy-900 hover:bg-navy-900 hover:text-white",
          )}
        >
          <Icon name="refresh" size={15} />
          تولید خودکار
        </button>
      </div>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section grouping inside a form                                            */
/* -------------------------------------------------------------------------- */

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[0.9375rem] font-bold text-navy-900">{title}</h2>
        {description && (
          <p className="mt-1 text-[0.8125rem] text-muted">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-6 p-5">{children}</div>
    </section>
  );
}

/** Labelled switch backed by a real checkbox so it posts with the form. */
export function ToggleField({
  name,
  label,
  description,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-sm border border-line-2 bg-white p-4">
      <span className="min-w-0">
        <span className="block text-[0.875rem] font-semibold text-navy-900">
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-[0.8125rem] leading-[1.9] text-muted">
            {description}
          </span>
        )}
      </span>

      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer size-0 opacity-0"
        />
        <span
          aria-hidden="true"
          className={cn(
            "block h-6 w-11 rounded-full bg-line-2 transition-colors duration-250",
            "peer-checked:bg-navy-900",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-500",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute end-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm",
            "transition-transform duration-250 ease-[var(--ease-out-quint)]",
            "peer-checked:-translate-x-5",
          )}
        />
      </span>
    </label>
  );
}
