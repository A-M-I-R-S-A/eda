import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFaqsByIds,
  getServiceBySlug,
  getSettings,
  listServices,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { SERVICE_CATEGORY } from "@/lib/config/labels";
import { isLive } from "@/lib/cms/status";
import { buildCmsMetadata } from "@/lib/seo/cms-metadata";
import { JsonLd, breadcrumbJsonLd, serviceJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { RichText } from "@/lib/content/rich-text";
import { fa } from "@/lib/utils/persian";
import { safeStaticParams } from "@/lib/cms/build-params";
import { PageHero } from "@/components/layout/page-hero";
import { ServiceCardCompact } from "@/components/cards/service-card";
import { CtaBand } from "@/components/sections/cta-band";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return safeStaticParams(async () => {
    const services = await listServices({ publishedOnly: true });
    return services.map((service) => ({ slug: service.slug }));
  }, "services");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [service, settings] = await Promise.all([
    getServiceBySlug(slug),
    getSettings(),
  ]);

  if (!service) {
    return { title: "خدمت یافت نشد", robots: { index: false, follow: false } };
  }

  return buildCmsMetadata({
    seo: service.seo,
    defaults: settings.seo,
    title: service.title,
    description: service.shortDescription,
    path: ROUTES.service(service.slug),
    image: service.image,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  // Drafts, archived services and not-yet-due scheduled ones are 404s.
  if (!service || !isLive(service)) notFound();

  const [settings, allServices, faqs] = await Promise.all([
    getSettings(),
    listServices({ publishedOnly: true }),
    getFaqsByIds(service.faqIds),
  ]);

  const related = allServices.filter((s) =>
    service.relatedSlugs.includes(s.slug),
  );

  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd(service, settings),
          breadcrumbJsonLd([
            { label: "خدمات", href: ROUTES.services },
            { label: service.title, href: ROUTES.service(service.slug) },
          ]),
          ...(faqs.length ? [faqJsonLd(faqs)] : []),
        ]}
      />

      <PageHero
        eyebrow={SERVICE_CATEGORY[service.category]}
        breadcrumbs={[
          { label: "خدمات", href: ROUTES.services },
          { label: service.title },
        ]}
        title={service.title}
        lead={service.shortDescription}
        aside={
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <ButtonLink
              href={ROUTES.consultation}
              variant="primary"
              size="lg"
              iconEnd="arrow-forward"
            >
              ثبت درخواست
            </ButtonLink>
            <ButtonLink href={ROUTES.appointment} variant="outline" size="lg">
              رزرو وقت
            </ButtonLink>
          </div>
        }
      />

      <div className="section">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            {/* -- body ---------------------------------------------------- */}
            <div className="lg:col-span-8">
              <RichText source={service.body} />

              {/* process */}
              {service.process.length > 0 && (
                <section className="mt-16">
                  <h2 className="text-[1.375rem] font-bold text-navy-900">
                    مراحل انجام کار
                  </h2>

                  <ol className="mt-8 flex flex-col">
                    {service.process.map((step, index) => (
                      <Reveal
                        as="li"
                        key={step.title}
                        delay={index * 60}
                        className="relative flex gap-5 border-b border-line py-6 last:border-0"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-2 text-[0.8125rem] font-semibold text-navy-700 tabular-nums">
                          {fa(index + 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[1rem] font-bold text-navy-900">
                            {step.title}
                          </h3>
                          <p className="mt-2 text-[0.9375rem] leading-[2] text-muted">
                            {step.description}
                          </p>
                        </div>
                      </Reveal>
                    ))}
                  </ol>
                </section>
              )}

              {/* faq */}
              {faqs.length > 0 && (
                <section className="mt-16">
                  <h2 className="text-[1.375rem] font-bold text-navy-900">
                    پرسش‌های مرتبط
                  </h2>
                  <Accordion
                    className="mt-6"
                    items={faqs.map((f) => ({
                      id: f.id,
                      question: f.question,
                      answer: f.answer,
                    }))}
                  />
                </section>
              )}
            </div>

            {/* -- sidebar ------------------------------------------------- */}
            <aside className="lg:col-span-4">
              <div className="sticky top-28 flex flex-col gap-6">
                {service.highlights.length > 0 && (
                  <div className="surface p-6 lg:p-7">
                    <h2 className="text-[1.0625rem] font-bold text-navy-900">
                      نکات کلیدی
                    </h2>
                    <ul className="mt-5 flex flex-col gap-3.5">
                      {service.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="flex items-start gap-2.5 text-[0.875rem] leading-[1.95] text-ink-2"
                        >
                          <Icon
                            name="check"
                            size={16}
                            weight={2}
                            className="mt-1 shrink-0 text-gold-600"
                          />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="on-navy relative overflow-hidden p-6 lg:p-7">
                  <div
                    aria-hidden="true"
                    className="grid-lines pointer-events-none absolute inset-0"
                  />
                  <div className="relative">
                    <h2 className="text-[1.0625rem] font-bold text-white">
                      نیاز به بررسی پرونده دارید؟
                    </h2>
                    <p className="mt-3 text-[0.875rem] leading-[2] text-white/60">
                      شرح موضوع و مستندات خود را ثبت کنید تا پس از بررسی مقدماتی،
                      مسیر پیشنهادی به شما اعلام شود.
                    </p>
                    <ButtonLink
                      href={ROUTES.consultation}
                      variant="accent"
                      size="md"
                      block
                      className="mt-6"
                    >
                      ثبت درخواست مشاوره
                    </ButtonLink>
                    <a
                      href={`tel:${settings.phones[0]}`}
                      className="mt-4 flex items-center justify-center gap-2 text-[0.875rem] text-white/70 transition-colors hover:text-white"
                    >
                      <Icon name="phone" size={15} className="text-gold-400" />
                      <span dir="ltr">{settings.phones[0]}</span>
                    </a>
                  </div>
                </div>

                {related.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-[0.8125rem] font-semibold text-muted">
                      خدمات مرتبط
                    </h2>
                    <div className="flex flex-col gap-3">
                      {related.map((item) => (
                        <ServiceCardCompact key={item.id} service={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <CtaBand phone={settings.phones[0]} />
    </>
  );
}
