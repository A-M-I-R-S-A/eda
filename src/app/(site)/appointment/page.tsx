import type { Metadata } from "next";
import { getSettings, listArbitrators } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { getCsrfToken } from "@/lib/security/csrf";
import { phoneVerificationRequired } from "@/lib/sms/constants";
import { faPhone } from "@/lib/utils/persian";
import { PageHero } from "@/components/layout/page-hero";
import { AppointmentWizard } from "@/components/forms/appointment-wizard";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await systemPageMetadata("appointment", {
    title: "رزرو وقت مشاوره",
    description:
      "رزرو آنلاین وقت مشاوره حقوقی یا جلسه داوری؛ انتخاب نوع مشاوره، داور، تاریخ و ساعت، و نحوه برگزاری جلسه به‌صورت حضوری، آنلاین یا تلفنی.",
    path: ROUTES.appointment,
  });

  return meta;
}

interface PageProps {
  searchParams: Promise<{ arbitrator?: string }>;
}

export default async function AppointmentPage({ searchParams }: PageProps) {
  const [{ arbitrator }, settings, arbitrators, csrfToken, copy] = await Promise.all([
    searchParams,
    getSettings(),
    listArbitrators({ publishedOnly: true }),
    getCsrfToken(),
    getSystemPage("appointment", {
      eyebrow: "رزرو وقت",
      heading: "رزرو وقت مشاوره یا جلسه داوری",
      lead: "در چند گام کوتاه، نوع مشاوره، مشاور، تاریخ و ساعت جلسه را انتخاب کنید.",
    }),
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ label: "رزرو وقت", href: ROUTES.appointment }])}
      />

      <PageHero
        eyebrow={copy.eyebrow}
        breadcrumbs={[{ label: copy.page?.title ?? "رزرو وقت مشاوره" }]}
        title={copy.heading}
        lead={copy.lead}
        aside={
          <div className="surface flex items-center gap-4 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-2 text-navy-700">
              <Icon name="phone" size={19} />
            </span>
            <div>
              <p className="text-[0.75rem] text-muted">رزرو تلفنی</p>
              <a
                href={`tel:${settings.phones[0]}`}
                dir="ltr"
                className="text-[1.0625rem] font-semibold text-navy-900"
              >
                {faPhone(settings.phones[0])}
              </a>
            </div>
          </div>
        }
      />

      <section className="section">
        <div className="container-x">
          <div className="mx-auto max-w-4xl">
            <AppointmentWizard
              arbitrators={arbitrators}
              settings={settings.appointments}
              csrfToken={csrfToken}
              phone={settings.phones[0]}
              preselectedArbitratorId={arbitrator}
              requirePhoneVerification={phoneVerificationRequired(settings.sms)}
            />

            <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
              {[
                {
                  icon: "clock" as const,
                  title: "ساعات کاری",
                  // Read from site settings so the card cannot contradict the
                  // calendar the visitor is booking in.
                  body:
                    settings.workingHours
                      .slice(0, 2)
                      .map((hour) => `${hour.label} ${hour.value}`)
                      .join(" — ") || "با هماهنگی قبلی",
                },
                {
                  icon: "refresh" as const,
                  title: "تغییر یا لغو",
                  body: "تا ۲۴ ساعت پیش از جلسه با تماس تلفنی امکان‌پذیر است",
                },
                {
                  icon: "shield" as const,
                  title: "محرمانگی",
                  body: "موضوع جلسه و اطلاعات شما محرمانه نگهداری می‌شود",
                },
              ].map((item) => (
                <div key={item.title} className="bg-white p-5">
                  <Icon name={item.icon} size={18} className="text-gold-600" />
                  <h2 className="mt-3 text-[0.9375rem] font-semibold text-navy-900">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-[0.8125rem] leading-[1.95] text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
