import type { Metadata } from "next";
import type { ServiceCategory } from "@/types";
import { getSettings, listServices } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { SERVICE_CATEGORY } from "@/lib/config/labels";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { buildSectionContext } from "@/lib/cms/page-context";
import { SectionRenderer } from "@/components/sections/renderer";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { fa } from "@/lib/utils/persian";
import { PageHero } from "@/components/layout/page-hero";
import { ServiceCard } from "@/components/cards/service-card";
import { CtaBand } from "@/components/sections/cta-band";
import { EmptyState } from "@/components/ui/states";

export async function generateMetadata(): Promise<Metadata> {
  return systemPageMetadata("services", {
    title: "خدمات مؤسسه",
    description:
      "خدمات مؤسسه: داوری، رسیدگی به اختلافات، میانجی‌گری، مشاوره حقوقی و تنظیم و بررسی قراردادها.",
    path: ROUTES.services,
  });
}

const CATEGORY_ORDER: ServiceCategory[] = [
  "arbitration",
  "dispute-resolution",
  "advisory",
];

export default async function ServicesPage() {
  const [settings, services, copy] = await Promise.all([
    getSettings(),
    listServices({ publishedOnly: true }),
    getSystemPage("services", {
      eyebrow: "خدمات تخصصی",
      heading: "خدماتی که در هر مرحله از یک اختلاف در اختیار شماست",
      lead: "فهرست زیر همان چیزی است که مؤسسه ارائه می‌دهد.",
    }),
  ]);

  const extraContext = await buildSectionContext(copy.extraSections);

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    title: SERVICE_CATEGORY[category],
    items: services.filter((s) => s.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ label: "خدمات", href: ROUTES.services }]),
          itemListJsonLd(
            "خدمات مؤسسه داوری دادآور",
            services.map((s) => ({ name: s.title, href: ROUTES.service(s.slug) })),
          ),
        ]}
      />

      <PageHero
        eyebrow={copy.eyebrow}
        breadcrumbs={[{ label: copy.page?.title ?? "خدمات" }]}
        title={copy.heading}
        lead={copy.lead}
        aside={
          <div className="flex flex-col gap-1 border-s-2 border-gold-400 ps-5">
            <span className="text-[2rem] font-bold leading-none text-navy-900 tabular-nums">
              {fa(services.length)}
            </span>
            <span className="text-[0.8125rem] text-muted">حوزه خدماتی</span>
          </div>
        }
      />

      {services.length === 0 ? (
        <div className="container-x section">
          <EmptyState
            className="border border-line bg-white"
            icon="briefcase"
            title="هنوز خدمتی منتشر نشده است"
            description="فهرست خدمات پس از انتشار از پنل مدیریت در این صفحه نمایش داده می‌شود."
            action={{ label: "تماس با ما", href: ROUTES.contact }}
          />
        </div>
      ) : (
        grouped.map((group, groupIndex) => (
          <section
            key={group.category}
            className={
              groupIndex % 2 === 0
                ? "section border-b border-line"
                : "section border-b border-line bg-paper-2/40"
            }
          >
            <div className="container-x">
              <div className="flex items-end justify-between gap-6 border-b border-line pb-5">
                <h2 className="text-[1.375rem] font-bold text-navy-900 sm:text-[1.625rem]">
                  {group.title}
                </h2>
                <span className="shrink-0 text-[0.8125rem] text-muted tabular-nums">
                  {fa(group.items.length)} خدمت
                </span>
              </div>

              <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index} />
                ))}
              </div>
            </div>
          </section>
        ))
      )}

      <CtaBand phone={settings.phones[0]} />

      <SectionRenderer sections={copy.extraSections} context={extraContext} />
    </>
  );
}
