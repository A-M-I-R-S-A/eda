"use client";

import { useEffect } from "react";
import { ROUTES } from "@/lib/config/routes";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Root error boundary.
 *
 * The raw message is never shown to visitors — a stack trace can leak file
 * paths and internals. The digest is displayed instead so a caller can quote
 * it to support, and the full error is logged server-side.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[boundary] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-danger/20 bg-danger-soft text-danger">
          <Icon name="alert" size={28} />
        </span>

        <h1 className="mt-7 text-[1.5rem] font-bold text-navy-950">
          خطایی رخ داد
        </h1>

        <p className="mt-4 text-[0.9375rem] leading-[2] text-muted">
          متأسفانه در پردازش این صفحه مشکلی پیش آمد. لطفاً دوباره تلاش کنید؛ اگر
          مشکل ادامه داشت با ما تماس بگیرید.
        </p>

        {error.digest && (
          <p className="mt-4 inline-block rounded-xs bg-paper-2 px-3 py-1.5 text-[0.75rem] text-muted-2">
            کد خطا: <span dir="ltr">{error.digest}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="primary" size="lg" icon="refresh" onClick={reset}>
            تلاش مجدد
          </Button>
          <ButtonLink href={ROUTES.home} variant="outline" size="lg">
            بازگشت به صفحه اصلی
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
