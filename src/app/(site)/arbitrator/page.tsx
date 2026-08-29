import type { Metadata } from "next";
import type { Arbitrator, CredentialEntry } from "@/types";
import {
  getPrincipalArbitrator,
  getSettings,
  listAdditionalArbitrators,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { getSystemPage, systemPageMetadata } from "@/lib/cms/system-page";
import { JsonLd, breadcrumbJsonLd, personJsonLd } from "@/lib/seo/jsonld";
import { RichText } from "@/lib/content/rich-text";
import { faNumber } from "@/lib/utils/persian";
import { Portrait } from "@/components/brand/portrait";
import { ArbitratorCard } from "@/components/cards/arbitrator-card";
import { CtaBand } from "@/components/sections/cta-band";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Icon } from "@/components/ui/icon";
import { PendingContent } from "@/components/ui/pending";
import { Reveal } from "@/components/ui/reveal";

/**
 * The arbitrator's profile — «درباره داور».
 *
 * The institution has ONE arbitrator, so this is a person page, not a
 * directory: no cards grid, no counts, no "our team". Sections the institution
 * has not supplied render a marked placeholder instead of invented credentials.
 */
export async function generateMetadata(): Promise<Metadata> {
  const meta = await systemPageMetadata("arbitrator", {
    title: "درباره داور",
    description:
      "پروفایل حرفه‌ای داور مؤسسه؛ معرفی، تخصص‌ها، حوزه‌های فعالیت، سوابق حرفه‌ای و رویکرد حرفه‌ای در رسیدگی به پرونده‌های داوری.",
    path: ROUTES.arbitrator,
  });

  return meta;
}

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                           */
/* -------------------------------------------------------------------------- */

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[1.25rem] font-bold text-navy-900">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** A plain list of supplied terms — expertise or practice areas. */
function TermList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
      {items.map((item, index) => (
        <Reveal
          as="li"
          key={item}
          delay={index * 50}
          className="flex items-start gap-3 bg-white px-5 py-4"
        >
          <Icon
            name="check"
            size={16}
            weight={2}
            className="mt-1 shrink-0 text-gold-600"
          />
          <span className="text-[0.9375rem] leading-[1.95] text-ink-2">{item}</span>
        </Reveal>
      ))}
    </ul>
  );
}

function CredentialList({ entries }: { entries: CredentialEntry[] }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <Reveal
          as="li"
          key={`${entry.title}-${index}`}
          delay={index * 60}
          className="flex flex-col gap-1 border-b border-line py-5 first:pt-0 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
        >
          <div className="min-w-0">
            <h3 className="text-[1rem] font-semibold text-navy-900">{entry.title}</h3>
            {entry.institution && (
              <p className="mt-1 text-[0.875rem] text-muted">{entry.institution}</p>
            )}
          </div>
          {entry.period && (
            <p className="shrink-0 text-[0.8125rem] text-muted-2 tabular-nums">
              {entry.period}
            </p>
          )}
        </Reveal>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function ArbitratorPage() {
  const [arbitrator, settings, additional] = await Promise.all([
    getPrincipalArbitrator(),
    getSettings(),
    listAdditionalArbitrators(),
  ]);

  if (!arbitrator) {
    return (
      <div className="container-x section">
        <EmptyState
          className="border border-line bg-white"
          icon="gavel"
          title="پروفایل داور هنوز منتشر نشده است"
          description="اطلاعات داور مؤسسه پس از انتشار از پنل مدیریت در این صفحه نمایش داده می‌شود."
          action={{ label: "تماس با ما", href: ROUTES.contact }}
        />
      </div>
    );
  }

  return (
    <>
      <JsonLd
        data={[
          personJsonLd(arbitrator),
          breadcrumbJsonLd([{ label: "درباره داور", href: ROUTES.arbitrator }]),
        ]}
      />

      <ProfileHeader arbitrator={arbitrator} institutionName={settings.institutionName} />

      {/* -- body ------------------------------------------------------------ */}
      <div className="section">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-16 lg:col-span-8">
              {/* معرفی */}
              <ProfileSection title="معرفی">
                {arbitrator.biography.trim() ? (
                  <RichText source={arbitrator.biography} className="prose-fa" />
                ) : (
                  <PendingContent
                    label="متن معرفی داور"
                    hint="این بخش از مسیر «پنل مدیریت ← داور» قابل ویرایش است."
                  />
                )}
              </ProfileSection>

              {/* تخصص‌ها */}
              <ProfileSection title="تخصص‌ها">
                {arbitrator.expertise.length > 0 ? (
                  <TermList items={arbitrator.expertise} />
                ) : (
                  <PendingContent label="فهرست تخصص‌ها" />
                )}
              </ProfileSection>

              {/* حوزه‌های فعالیت */}
              <ProfileSection title="حوزه‌های فعالیت">
                {arbitrator.practiceAreas.length > 0 ? (
                  <TermList items={arbitrator.practiceAreas} />
                ) : (
                  <PendingContent label="فهرست حوزه‌های فعالیت" />
                )}
              </ProfileSection>

              {/* سوابق حرفه‌ای */}
              <ProfileSection title="سوابق حرفه‌ای">
                {arbitrator.background.length > 0 ? (
                  <CredentialList entries={arbitrator.background} />
                ) : (
                  <PendingContent label="سوابق حرفه‌ای" />
                )}
              </ProfileSection>

              {/* تحصیلات — shown only once supplied. */}
              {arbitrator.education.length > 0 && (
                <ProfileSection title="تحصیلات">
                  <CredentialList entries={arbitrator.education} />
                </ProfileSection>
              )}

              {/* رویکرد حرفه‌ای */}
              <ProfileSection title="رویکرد حرفه‌ای">
                {arbitrator.approach.trim() ? (
                  <RichText source={arbitrator.approach} className="prose-fa" />
                ) : (
                  <PendingContent label="شرح رویکرد حرفه‌ای" />
                )}
              </ProfileSection>
            </div>

            <aside className="lg:col-span-4">
              <div className="sticky top-28 flex flex-col gap-6">
                {arbitrator.memberships.length > 0 && (
                  <div className="surface p-6">
                    <h2 className="text-[1.0625rem] font-bold text-navy-900">
                      عضویت‌های حرفه‌ای
                    </h2>
                    <ul className="mt-4 flex flex-col gap-3">
                      {arbitrator.memberships.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-[0.875rem] leading-[1.95] text-ink-2"
                        >
                          <Icon
                            name="check"
                            size={16}
                            weight={2}
                            className="mt-1 shrink-0 text-gold-600"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="surface p-6">
                  <h2 className="text-[1.0625rem] font-bold text-navy-900">
                    ارجاع پرونده و مکاتبه
                  </h2>
                  <p className="mt-3 text-[0.875rem] leading-[2] text-muted">
                    مکاتبات مربوط به پرونده‌ها از طریق دبیرخانه {settings.institutionName}{" "}
                    انجام می‌شود.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 text-[0.875rem]">
                    <a
                      href={`tel:${settings.phones[0]}`}
                      className="flex items-center gap-2.5 text-navy-800 transition-colors hover:text-navy-950"
                    >
                      <Icon name="phone" size={16} className="text-gold-600" />
                      <span dir="ltr">{settings.phones[0]}</span>
                    </a>
                    <a
                      href={`mailto:${arbitrator.email ?? settings.email}`}
                      className="flex items-center gap-2.5 text-navy-800 transition-colors hover:text-navy-950"
                    >
                      <Icon name="mail" size={16} className="text-gold-600" />
                      <span dir="ltr" className="truncate">
                        {arbitrator.email ?? settings.email}
                      </span>
                    </a>
                  </div>

                  <hr className="hairline my-6" />

                  <ButtonLink
                    href={ROUTES.contact}
                    variant="outline"
                    size="sm"
                    block
                  >
                    تماس با مؤسسه
                  </ButtonLink>
                </div>
              </div>
            </aside>
          </div>

          {/*
            Renders only if the institution ever adds further arbitrators. With
            the current single-arbitrator structure this section never appears.
          */}
          {additional.length > 0 && (
            <section className="mt-20 border-t border-line pt-14">
              <h2 className="text-[1.25rem] font-bold text-navy-900">
                سایر داوران مجموعه
              </h2>
              <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                {additional.map((other) => (
                  <ArbitratorCard key={other.id} arbitrator={other} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <CtaBand
        phone={settings.phones[0]}
        title="می‌خواهید پرونده خود را مطرح کنید؟"
        description="شرح موضوع و مستندات کلیدی را ثبت کنید؛ پس از بررسی مقدماتی، مسیر پیشنهادی و مراحل بعدی به شما اعلام می‌شود."
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Establishes the hierarchy the whole site rests on:
 * institution → its arbitrator. The institution is the eyebrow; the person is
 * the headline.
 */
function ProfileHeader({
  arbitrator,
  institutionName,
}: {
  arbitrator: Arbitrator;
  institutionName: string;
}) {
  const hasExperience = arbitrator.yearsOfExperience > 0;
  const hasLanguages = arbitrator.languages.length > 0;

  return (
    <section className="on-navy relative overflow-hidden border-b border-white/10">
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0 opacity-70"
      />

      <div className="container-x relative py-8 lg:py-10">
        <Breadcrumbs onDark items={[{ label: "درباره داور" }]} />
      </div>

      <div className="container-x relative pb-14 lg:pb-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4 xl:col-span-3">
            <Portrait
              fullName={arbitrator.fullName}
              photoUrl={arbitrator.photoUrl}
              priority
              sizes="(max-width: 1024px) 60vw, 320px"
              className="aspect-[4/5] w-full max-w-xs border border-white/10"
            />
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            <p className="eyebrow eyebrow-on-dark">{institutionName}</p>

            <h1 className="display-2 mt-5 text-white">{arbitrator.fullName}</h1>

            <p className="mt-4 text-[1.0625rem] font-medium text-gold-200">
              {arbitrator.title}
            </p>

            {arbitrator.shortBio.trim() ? (
              <p className="lead lead-on-dark mt-6 max-w-2xl">{arbitrator.shortBio}</p>
            ) : (
              <PendingContent
                onDark
                className="mt-7 max-w-2xl"
                label="معرفی کوتاه داور"
              />
            )}

            {arbitrator.expertise.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {arbitrator.expertise.map((item) => (
                  <li
                    key={item}
                    className="rounded-xs border border-white/12 px-3 py-1.5 text-[0.8125rem] text-white/75"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {/* Only facts that have actually been supplied get a tile. */}
            {(hasExperience || hasLanguages || arbitrator.bookable) && (
              <dl className="mt-10 grid gap-px bg-white/10 sm:grid-cols-3">
                {hasExperience && (
                  <div className="bg-navy-900 px-5 py-4">
                    <dt className="text-[0.75rem] text-white/45">سابقه حرفه‌ای</dt>
                    <dd className="mt-1 text-[1.0625rem] font-semibold text-white">
                      {faNumber(arbitrator.yearsOfExperience)} سال
                    </dd>
                  </div>
                )}
                {hasLanguages && (
                  <div className="bg-navy-900 px-5 py-4">
                    <dt className="text-[0.75rem] text-white/45">زبان‌های کاری</dt>
                    <dd className="mt-1 text-[1.0625rem] font-semibold text-white">
                      {arbitrator.languages.join("، ")}
                    </dd>
                  </div>
                )}
                {arbitrator.bookable && (
                  <div className="bg-navy-900 px-5 py-4">
                    <dt className="text-[0.75rem] text-white/45">وضعیت رزرو</dt>
                    <dd className="mt-1 text-[1.0625rem] font-semibold text-white">
                      پذیرش وقت مشاوره
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {arbitrator.bookable && (
                <ButtonLink
                  href={`${ROUTES.appointment}?arbitrator=${arbitrator.id}`}
                  variant="accent"
                  size="lg"
                  iconEnd="arrow-forward"
                >
                  رزرو وقت مشاوره
                </ButtonLink>
              )}
              <ButtonLink
                href={ROUTES.contact}
                variant="outline-light"
                size="lg"
              >
                تماس با مؤسسه
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
