import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { SOCIAL_PLATFORM } from "@/lib/config/labels";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { buildSectionContext } from "@/lib/cms/page-context";
import { SectionRenderer } from "@/components/sections/renderer";
import { JsonLd, breadcrumbJsonLd, contactPageJsonLd } from "@/lib/seo/jsonld";
import { getCsrfToken } from "@/lib/security/csrf";
import { fa, faPhone } from "@/lib/utils/persian";
import { PageHero } from "@/components/layout/page-hero";
import { ContactForm } from "@/components/forms/contact-form";
import { NotaryOffice } from "@/components/sections/notary-office";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import type { SiteSettings } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  return systemPageMetadata("contact", {
    title: "تماس با ما",
    description:
      "شماره تماس، ایمیل، آدرس دفتر، ساعات کاری و موقعیت روی نقشه؛ به‌همراه فرم تماس مستقیم.",
    path: ROUTES.contact,
  });
}

export default async function ContactPage() {
  const [settings, csrfToken, copy] = await Promise.all([
    getSettings(),
    getCsrfToken(),
    getSystemPage("contact", {
      eyebrow: "تماس با ما",
      heading: "در دسترس، در روزهای کاری",
      lead: "برای پرسش‌های عمومی از فرم تماس استفاده کنید.",
    }),
  ]);

  const extraContext = await buildSectionContext(copy.extraSections);

  return (
    <>
      <JsonLd
        data={[
          contactPageJsonLd(settings),
          breadcrumbJsonLd([{ label: "تماس با ما", href: ROUTES.contact }]),
        ]}
      />

      <PageHero
        eyebrow={copy.eyebrow}
        breadcrumbs={[{ label: copy.page?.title ?? "تماس با ما" }]}
        title={copy.heading}
        lead={copy.lead}
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

      {/* -- contact cards --------------------------------------------------- */}
      <section className="border-b border-line">
        <div className="container-x">
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-paper p-6 lg:p-8">
              <Icon name="phone" size={20} className="text-gold-600" />
              <h2 className="mt-4 text-[0.9375rem] font-bold text-navy-900">
                شماره تماس
              </h2>
              <div className="mt-3 flex flex-col gap-1.5">
                {settings.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone}`}
                    dir="ltr"
                    className="text-start text-[0.9375rem] text-ink-2 transition-colors hover:text-navy-900"
                  >
                    {faPhone(phone)}
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-paper p-6 lg:p-8">
              <Icon name="mail" size={20} className="text-gold-600" />
              <h2 className="mt-4 text-[0.9375rem] font-bold text-navy-900">
                پست الکترونیک
              </h2>
              <a
                href={`mailto:${settings.email}`}
                dir="ltr"
                className="mt-3 block text-start text-[0.9375rem] text-ink-2 transition-colors hover:text-navy-900"
              >
                {settings.email}
              </a>
            </div>

            <div className="bg-paper p-6 lg:p-8">
              <Icon name="map-pin" size={20} className="text-gold-600" />
              <h2 className="mt-4 text-[0.9375rem] font-bold text-navy-900">
                نشانی دفتر
              </h2>
              <p className="mt-3 text-[0.875rem] leading-[2] text-muted">
                {settings.address}
              </p>
              <p className="mt-2 text-[0.8125rem] text-muted-2">
                کد پستی: {fa(settings.postalCode)}
              </p>
            </div>

            <div className="bg-paper p-6 lg:p-8">
              <Icon name="clock" size={20} className="text-gold-600" />
              <h2 className="mt-4 text-[0.9375rem] font-bold text-navy-900">
                ساعات کاری
              </h2>
              <dl className="mt-3 flex flex-col gap-2">
                {settings.workingHours.map((hour) => (
                  <div key={hour.label} className="text-[0.8125rem] leading-[1.9]">
                    <dt className="text-muted">{hour.label}</dt>
                    <dd className="font-medium text-navy-900">{hour.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* -- form + map ------------------------------------------------------ */}
      <section className="section">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <div className="surface p-6 sm:p-8 lg:p-10">
                <h2 className="text-[1.25rem] font-bold text-navy-900">
                  فرم تماس
                </h2>
                <p className="mt-2 text-[0.9375rem] leading-[2] text-muted">
                  پیام شما مستقیماً به دبیرخانه مؤسسه ارسال می‌شود.
                </p>

                <hr className="hairline my-7" />

                <ContactForm csrfToken={csrfToken} />
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className="flex flex-col gap-6">
                <div className="surface overflow-hidden">
                  <div className="relative aspect-[4/3] bg-paper-2">
                    <iframe
                      src={settings.mapEmbedUrl}
                      title={`موقعیت ${settings.institutionName} روی نقشه`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0 size-full border-0"
                    />
                  </div>
                  <div className="border-t border-line p-5">
                    <h2 className="text-[0.9375rem] font-bold text-navy-900">
                      موقعیت روی نقشه
                    </h2>
                    <p className="mt-2 text-[0.8125rem] leading-[1.95] text-muted">
                      {settings.address}
                    </p>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${settings.mapLat}&mlon=${settings.mapLng}#map=17/${settings.mapLat}/${settings.mapLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-[0.875rem] font-semibold text-navy-800 transition-colors hover:text-navy-950"
                    >
                      مشاهده در نقشه بزرگ‌تر
                      <Icon name="external" size={15} className="text-gold-600" />
                    </a>
                  </div>
                </div>

                {settings.socials.length > 0 && (
                  <div className="surface p-6">
                    <h2 className="text-[0.9375rem] font-bold text-navy-900">
                      شبکه‌های اجتماعی
                    </h2>
                    <ul className="mt-4 grid grid-cols-2 gap-2.5">
                      {settings.socials.map((social) => (
                        <li key={social.platform}>
                          <a
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 rounded-sm border border-line-2 px-3.5 py-3 text-[0.875rem] text-ink-2 transition-colors hover:border-navy-900 hover:text-navy-900"
                          >
                            <Icon
                              name={SOCIAL_PLATFORM[social.platform]?.icon ?? "globe"}
                              size={17}
                              className="text-gold-600"
                            />
                            {social.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="on-navy relative overflow-hidden p-6">
                  <div
                    aria-hidden="true"
                    className="grid-lines pointer-events-none absolute inset-0"
                  />
                  <div className="relative">
                    <Icon name="shield" size={20} className="text-gold-400" />
                    <h2 className="mt-4 text-[1rem] font-bold text-white">
                      پیش از ارسال اطلاعات محرمانه
                    </h2>
                    <p className="mt-3 text-[0.8125rem] leading-[2] text-white/60">
                      لطفاً مدارک و جزئیات پرونده را از طریق فرم درخواست مشاوره
                      ارسال کنید؛ آن مسیر برای انتقال اسناد محرمانه طراحی شده است.
                    </p>
                    <ButtonLink
                      href={ROUTES.consultation}
                      variant="outline-light"
                      size="sm"
                      block
                      className="mt-5"
                    >
                      رفتن به فرم درخواست
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/*
        A separate professional entity, deliberately placed *after* the
        institution's own contact details and inside its own bordered block so
        the two are never read as one organisation. Renders nothing unless real
        details have been supplied and enabled in the admin panel.
      */}
      <NotaryOffice settings={settings} />

      <SectionRenderer sections={copy.extraSections} context={extraContext} />
    </>
  );
}
