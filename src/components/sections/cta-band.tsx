import { cn } from "@/lib/utils/cn";
import { faPhone } from "@/lib/utils/persian";
import { ROUTES } from "@/lib/config/routes";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/section";

/**
 * Closing call-to-action.
 *
 * Reused at the foot of most public pages so every route ends with the two
 * primary journeys — book a consultation, or file a request — plus a direct
 * phone line for visitors who would rather talk to someone.
 */
export function CtaBand({
  phone,
  title = "درباره پرونده خود مطمئن نیستید؟",
  description = "در یک جلسه مشاوره، مسیر حقوقی موضوع، گزینه‌های پیش رو و برآورد زمان و هزینه هر مسیر برای شما روشن می‌شود.",
  className,
}: {
  phone: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <section
      className={cn("relative overflow-hidden border-t border-line bg-paper-2/60", className)}
    >
      <div
        aria-hidden="true"
        className="grid-lines-light pointer-events-none absolute inset-0 opacity-70"
      />

      <div className="container-x relative section-sm">
        <div className="surface flex flex-col gap-8 p-8 lg:flex-row lg:items-center lg:justify-between lg:p-12">
          <div className="max-w-xl">
            <Eyebrow>گام بعدی</Eyebrow>
            <h2 className="mt-4 text-[1.5rem] font-bold leading-[1.6] text-navy-950 sm:text-[1.875rem]">
              {title}
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-[2.1] text-muted">
              {description}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <ButtonLink
              href={ROUTES.appointment}
              variant="primary"
              size="lg"
              iconEnd="arrow-forward"
              className="sm:min-w-[12.5rem]"
            >
              رزرو وقت مشاوره
            </ButtonLink>

            <ButtonLink
              href={ROUTES.consultation}
              variant="outline"
              size="lg"
              className="sm:min-w-[12.5rem]"
            >
              ثبت درخواست
            </ButtonLink>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-2 text-[0.9375rem] font-semibold text-navy-800 transition-colors hover:text-navy-950"
          >
            <Icon name="phone" size={17} className="text-gold-600" />
            <span dir="ltr">{faPhone(phone)}</span>
          </a>
          <span aria-hidden="true" className="hidden h-4 w-px bg-line-2 sm:block" />
          <p className="text-[0.875rem] text-muted">
            پاسخ‌گویی در روزهای کاری، شنبه تا چهارشنبه ۹ تا ۱۸
          </p>
        </div>
      </div>
    </section>
  );
}
