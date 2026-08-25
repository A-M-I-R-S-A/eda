import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { REQUEST_STATUS, REQUEST_STATUS_ORDER } from "@/lib/config/labels";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { getCsrfToken } from "@/lib/security/csrf";
import { faPhone } from "@/lib/utils/persian";
import { PageHero } from "@/components/layout/page-hero";
import { TrackingForm } from "@/components/forms/tracking-form";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await systemPageMetadata("tracking", {
    title: "پیگیری درخواست",
    description:
      "مشاهده وضعیت درخواست مشاوره، داوری یا رزرو وقت با وارد کردن کد پیگیری و شماره موبایل ثبت‌شده.",
    path: ROUTES.tracking,
  });

  // Result views are personal; keep the page out of the index.
  return { ...meta, robots: { index: false, follow: true } };
}

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

const ALL_STATUSES = [
  ...REQUEST_STATUS_ORDER,
  "needs-info" as const,
  "cancelled" as const,
];

export default async function TrackingPage({ searchParams }: PageProps) {
  const [{ code }, settings, csrfToken, copy] = await Promise.all([
    searchParams,
    getSettings(),
    getCsrfToken(),
    getSystemPage("tracking", {
      eyebrow: "پیگیری",
      heading: "وضعیت درخواست خود را ببینید",
      lead: "با کد پیگیری و شماره موبایل خود، وضعیت لحظه‌ای پرونده را مشاهده کنید.",
    }),
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ label: "پیگیری درخواست", href: ROUTES.tracking }])}
      />

      <PageHero
        eyebrow={copy.eyebrow}
        breadcrumbs={[{ label: copy.page?.title ?? "پیگیری درخواست" }]}
        title={copy.heading}
        lead={copy.lead}
      />

      <section className="section">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-8">
              <TrackingForm csrfToken={csrfToken} defaultCode={code ?? ""} />
            </div>

            <aside className="lg:col-span-4">
              <div className="sticky top-28 flex flex-col gap-6">
                <div className="surface p-6">
                  <h2 className="text-[1.0625rem] font-bold text-navy-900">
                    وضعیت‌های ممکن
                  </h2>
                  <ul className="mt-5 flex flex-col gap-4">
                    {ALL_STATUSES.map((status) => (
                      <li key={status} className="flex flex-col gap-1.5">
                        <Badge tone={REQUEST_STATUS[status].tone} dot>
                          {REQUEST_STATUS[status].label}
                        </Badge>
                        <p className="text-[0.8125rem] leading-[1.9] text-muted">
                          {REQUEST_STATUS[status].description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="surface p-6">
                  <Icon name="question" size={19} className="text-gold-600" />
                  <h2 className="mt-3 text-[0.9375rem] font-bold text-navy-900">
                    کد پیگیری خود را گم کرده‌اید؟
                  </h2>
                  <p className="mt-2 text-[0.8125rem] leading-[1.95] text-muted">
                    با دبیرخانه مؤسسه تماس بگیرید. پس از احراز هویت، کد پیگیری
                    مجدداً برای شما ارسال می‌شود.
                  </p>
                  <a
                    href={`tel:${settings.phones[0]}`}
                    dir="ltr"
                    className="mt-4 flex items-center justify-center gap-2 rounded-sm border border-line-2 px-4 py-3 text-[1rem] font-semibold text-navy-900 transition-colors hover:border-navy-900"
                  >
                    <Icon name="phone" size={16} className="text-gold-600" />
                    {faPhone(settings.phones[0])}
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
