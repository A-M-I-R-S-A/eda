import type { Metadata } from "next";
import { getSettings, listFaqs } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { faqTopicLabel } from "@/lib/config/labels";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { buildSectionContext } from "@/lib/cms/page-context";
import { SectionRenderer } from "@/components/sections/renderer";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { fa } from "@/lib/utils/persian";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata(): Promise<Metadata> {
  return systemPageMetadata("faq", {
    title: "پرسش‌های متداول",
    description:
      "پاسخ به پرسش‌های متداول درباره داوری، فرآیند رسیدگی، هزینه‌ها و اعتبار رأی داوری.",
    path: ROUTES.faq,
  });
}

export default async function FaqPage() {
  const [settings, faqs, copy] = await Promise.all([
    getSettings(),
    listFaqs({ publishedOnly: true }),
    getSystemPage("faq", {
      eyebrow: "پرسش‌های متداول",
      heading: "آنچه پیش از ثبت درخواست خوب است بدانید",
      lead: "پاسخ‌های کوتاه و روشن به پرتکرارترین پرسش‌ها.",
    }),
  ]);

  const extraContext = await buildSectionContext(copy.extraSections);

  /**
   * Groups follow the order the questions themselves are in, so an
   * administrator reordering the FAQ list reorders the page — rather than a
   * fixed topic list here silently overriding them.
   */
  const groups = [...new Set(faqs.map((f) => f.topic))].map((topic) => ({
    topic,
    title: faqTopicLabel(topic),
    items: faqs.filter((f) => f.topic === topic),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ label: "پرسش‌های متداول", href: ROUTES.faq }]),
          ...(faqs.length ? [faqJsonLd(faqs)] : []),
        ]}
      />

      <PageHero
        eyebrow={copy.eyebrow}
        breadcrumbs={[{ label: copy.page?.title ?? "پرسش‌های متداول" }]}
        title={copy.heading}
        lead={copy.lead}
        aside={
          <div className="flex flex-col gap-1 border-s-2 border-gold-400 ps-5">
            <span className="text-[2rem] font-bold leading-none text-navy-900 tabular-nums">
              {fa(faqs.length)}
            </span>
            <span className="text-[0.8125rem] text-muted">پرسش پاسخ داده‌شده</span>
          </div>
        }
      />

      <section className="section">
        <div className="container-x">
          {groups.length === 0 ? (
            <EmptyState
              className="border border-line bg-white"
              icon="question"
              title="هنوز پرسشی ثبت نشده است"
              description="پرسش‌های متداول پس از افزودن از پنل مدیریت در این صفحه نمایش داده می‌شود."
              action={{ label: "تماس با ما", href: ROUTES.contact }}
            />
          ) : (
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              {/* -- jump nav ---------------------------------------------- */}
              <aside className="lg:col-span-3">
                <nav aria-label="موضوعات" className="sticky top-28">
                  <h2 className="mb-4 text-[0.8125rem] font-semibold text-muted">
                    موضوعات
                  </h2>
                  <ul className="flex flex-col border-s border-line">
                    {groups.map((group) => (
                      <li key={group.topic}>
                        <a
                          href={`#${group.topic}`}
                          className="-ms-px flex items-center justify-between gap-3 border-s-2 border-transparent py-2.5 ps-4 text-[0.875rem] text-ink-2 transition-colors hover:border-gold-400 hover:text-navy-900"
                        >
                          {group.title}
                          <span className="text-[0.75rem] text-muted-2 tabular-nums">
                            {fa(group.items.length)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>

                  <div className="surface mt-8 p-5">
                    <Icon name="question" size={19} className="text-gold-600" />
                    <h3 className="mt-3 text-[0.9375rem] font-bold text-navy-900">
                      پاسخ خود را پیدا نکردید؟
                    </h3>
                    <p className="mt-2 text-[0.8125rem] leading-[1.95] text-muted">
                      پرسش خود را برای ما بفرستید؛ در روزهای کاری پاسخ می‌دهیم.
                    </p>
                    <ButtonLink
                      href={ROUTES.contact}
                      variant="outline"
                      size="sm"
                      block
                      className="mt-4"
                    >
                      ارسال پرسش
                    </ButtonLink>
                  </div>
                </nav>
              </aside>

              {/* -- groups ------------------------------------------------- */}
              <div className="flex flex-col gap-14 lg:col-span-9">
                {groups.map((group) => (
                  <section
                    key={group.topic}
                    id={group.topic}
                    className="scroll-mt-32"
                  >
                    <h2 className="text-[1.375rem] font-bold text-navy-900">
                      {group.title}
                    </h2>
                    <Accordion
                      className="mt-6"
                      allowMultiple
                      items={group.items.map((f) => ({
                        id: f.id,
                        question: f.question,
                        answer: f.answer,
                      }))}
                      numbered
                    />
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <CtaBand
        phone={settings.phones[0]}
        title="پرسش شما اینجا نبود؟"
        description="موضوع خود را برای ما بنویسید؛ کارشناسان مؤسسه در روزهای کاری پاسخ می‌دهند."
      />

      <SectionRenderer sections={copy.extraSections} context={extraContext} />
    </>
  );
}
