import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { getCsrfToken } from "@/lib/security/csrf";
import { phoneVerificationRequired } from "@/lib/sms/constants";
import { fa, faPhone } from "@/lib/utils/persian";
import { PageHero } from "@/components/layout/page-hero";
import { ConsultationForm } from "@/components/forms/consultation-form";
import { Icon, type IconName } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await systemPageMetadata("consultation", {
    title: "درخواست مشاوره و داوری",
    description:
      "ثبت آنلاین درخواست مشاوره حقوقی، داوری یا میانجی‌گری؛ بارگذاری مدارک، انتخاب روش تماس و دریافت کد پیگیری برای مشاهده وضعیت پرونده.",
    path: ROUTES.consultation,
  });

  return meta;
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "edit",
    title: "تکمیل فرم",
    body: "مشخصات تماس، نوع درخواست و شرح موضوع را وارد کنید و در صورت وجود، مدارک را بارگذاری نمایید.",
  },
  {
    icon: "shield",
    title: "دریافت کد پیگیری",
    body: "بلافاصله پس از ثبت، یک کد پیگیری اختصاصی دریافت می‌کنید که باید آن را نگه دارید.",
  },
  {
    icon: "search",
    title: "بررسی مقدماتی",
    body: "کارشناسان مؤسسه در روزهای کاری موضوع را بررسی و صلاحیت رسیدگی را احراز می‌کنند.",
  },
  {
    icon: "phone",
    title: "تماس با شما",
    body: "نتیجه بررسی و مراحل بعدی از طریق روش تماس انتخابی شما اعلام می‌شود.",
  },
];

export default async function ConsultationPage() {
  const [settings, csrfToken, copy] = await Promise.all([
    getSettings(),
    getCsrfToken(),
    getSystemPage("consultation", {
      eyebrow: "ثبت درخواست",
      heading: "درخواست مشاوره، داوری یا میانجی‌گری",
      lead: "فرم زیر را تکمیل کنید تا موضوع شما بررسی شود.",
    }),
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { label: "درخواست مشاوره", href: ROUTES.consultation },
        ])}
      />

      <PageHero
        eyebrow={copy.eyebrow}
        breadcrumbs={[{ label: copy.page?.title ?? "درخواست مشاوره" }]}
        title={copy.heading}
        lead={copy.lead}
      />

      <section className="section">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            {/* -- form ---------------------------------------------------- */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="surface p-6 sm:p-8 lg:p-10">
                <h2 className="text-[1.25rem] font-bold text-navy-900">
                  اطلاعات درخواست
                </h2>
                <p className="mt-2 text-[0.875rem] text-muted">
                  فیلدهای دارای{" "}
                  <span className="text-gold-600" aria-hidden="true">
                    *
                  </span>{" "}
                  الزامی هستند.
                </p>

                <hr className="hairline my-7" />

                <ConsultationForm
                  csrfToken={csrfToken}
                  requirePhoneVerification={phoneVerificationRequired(settings.sms)}
                />
              </div>
            </div>

            {/* -- sidebar -------------------------------------------------- */}
            <aside className="lg:col-span-5 xl:col-span-4">
              <div className="sticky top-28 flex flex-col gap-6">
                <div className="surface p-6 lg:p-7">
                  <h2 className="text-[1.0625rem] font-bold text-navy-900">
                    مسیر رسیدگی به درخواست
                  </h2>

                  <ol className="mt-6 flex flex-col">
                    {STEPS.map((step, index) => (
                      <li
                        key={step.title}
                        className="relative flex gap-4 pb-6 last:pb-0"
                      >
                        {index < STEPS.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-2 start-[1.09rem] top-10 w-px bg-line"
                          />
                        )}
                        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-line-2 bg-white text-navy-700">
                          <Icon name={step.icon} size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.6875rem] font-semibold text-gold-600 tabular-nums">
                            گام {fa(index + 1)}
                          </p>
                          <h3 className="mt-0.5 text-[0.9375rem] font-semibold text-navy-900">
                            {step.title}
                          </h3>
                          <p className="mt-1.5 text-[0.8125rem] leading-[1.95] text-muted">
                            {step.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="on-navy relative overflow-hidden p-6 lg:p-7">
                  <div
                    aria-hidden="true"
                    className="grid-lines pointer-events-none absolute inset-0"
                  />
                  <div className="relative">
                    <Icon name="lock" size={20} className="text-gold-400" />
                    <h2 className="mt-4 text-[1.0625rem] font-bold text-white">
                      محرمانگی اطلاعات شما
                    </h2>
                    <ul className="mt-4 flex flex-col gap-3 text-[0.8125rem] leading-[1.95] text-white/60">
                      {[
                        "مدارک ارسالی خارج از دسترس عمومی نگهداری می‌شوند.",
                        "دسترسی به پرونده تنها برای تیم رسیدگی‌کننده امکان‌پذیر است.",
                        "اطلاعات شما در اختیار هیچ شخص ثالثی قرار نمی‌گیرد.",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <Icon
                            name="check"
                            size={15}
                            weight={2}
                            className="mt-1 shrink-0 text-gold-400"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="surface p-6">
                  <h2 className="text-[0.9375rem] font-bold text-navy-900">
                    ترجیح می‌دهید تلفنی صحبت کنید؟
                  </h2>
                  <a
                    href={`tel:${settings.phones[0]}`}
                    dir="ltr"
                    className="mt-3 flex items-center justify-center gap-2 rounded-sm border border-line-2 px-4 py-3 text-[1.0625rem] font-semibold text-navy-900 transition-colors hover:border-navy-900"
                  >
                    <Icon name="phone" size={17} className="text-gold-600" />
                    {faPhone(settings.phones[0])}
                  </a>
                  <ButtonLink
                    href={ROUTES.appointment}
                    variant="ghost"
                    size="sm"
                    block
                    className="mt-3"
                  >
                    یا رزرو وقت مشاوره
                  </ButtonLink>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
