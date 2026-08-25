import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";

/**
 * Confirmation panel shown after a request or booking is accepted.
 *
 * The code is the visitor's only handle on their case, so it is presented
 * large, LTR (codes are Latin), copyable, and paired with an explicit warning
 * to keep it — plus a direct link into the tracking page.
 */
export function Receipt({
  title,
  description,
  code,
  codeLabel,
  rows,
  children,
  className,
}: {
  title: string;
  description: string;
  code: string;
  codeLabel: string;
  rows: { label: string; value: ReactNode }[];
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface overflow-hidden", className)}>
      {/* header */}
      <div className="flex flex-col items-center border-b border-line bg-success-soft/50 px-6 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success text-white">
          <Icon name="check" size={26} weight={2.5} />
        </span>
        <h2 className="mt-5 text-[1.375rem] font-bold text-navy-950">{title}</h2>
        <p className="mt-3 max-w-md text-[0.9375rem] leading-[2] text-ink-2">
          {description}
        </p>
      </div>

      {/* code */}
      <div className="border-b border-line px-6 py-8 text-center">
        <p className="text-[0.8125rem] font-semibold text-muted">{codeLabel}</p>
        <p
          dir="ltr"
          className="mt-3 text-[2rem] font-bold tracking-[0.08em] text-navy-950 sm:text-[2.5rem]"
        >
          {code}
        </p>
        <div className="mt-4 flex justify-center">
          <CopyButton value={code} label="کپی کد" />
        </div>
      </div>

      {/* details */}
      <dl className="divide-y divide-line px-6">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 text-[0.875rem]"
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-medium text-navy-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-line p-6">
        <Alert tone="warning" title="کد خود را نگه دارید">
          برای مشاهده وضعیت، به این کد به‌همراه شماره موبایلی که ثبت کرده‌اید نیاز
          دارید. این کد تنها یک بار نمایش داده می‌شود.
        </Alert>

        {children}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={ROUTES.trackingResult(code)}
            variant="primary"
            size="lg"
            block
            iconEnd="arrow-forward"
          >
            پیگیری وضعیت
          </ButtonLink>
          <ButtonLink href={ROUTES.home} variant="outline" size="lg" block>
            بازگشت به صفحه اصلی
          </ButtonLink>
        </div>

        <p className="mt-5 text-center text-[0.8125rem] text-muted">
          سؤالی دارید؟{" "}
          <Link
            href={ROUTES.contact}
            className="font-medium text-navy-800 underline underline-offset-4 decoration-gold-300 hover:decoration-gold-500"
          >
            با ما تماس بگیرید
          </Link>
        </p>
      </div>
    </div>
  );
}
