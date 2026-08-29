import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getArbitratorBySlug,
  getPrincipalArbitrator,
  getSettings,
  listAdditionalArbitrators,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd, personJsonLd } from "@/lib/seo/jsonld";
import { RichText } from "@/lib/content/rich-text";
import { faNumber } from "@/lib/utils/persian";
import { safeStaticParams } from "@/lib/cms/build-params";
import { Portrait } from "@/components/brand/portrait";
import { CtaBand } from "@/components/sections/cta-band";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PendingContent } from "@/components/ui/pending";
import { Reveal } from "@/components/ui/reveal";

/**
 * Profile page for an arbitrator *other than* the principal.
 *
 * With the institution's current structure — one arbitrator — this route
 * produces no pages at all: `generateStaticParams` returns an empty list and
 * the principal's own slug redirects to the canonical `/arbitrator`. It exists
 * so that adding a second record in the admin panel gives that person a page
 * immediately, without a code change and without turning `/arbitrator` back
 * into a directory.
 */
interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Rendered per request.
 *
 * The public layout reads a cookie (`getCsrfToken`), which makes every page
 * under it dynamic. Next infers that for routes it renders at build time, but
 * `generateStaticParams` here legitimately returns an empty list while the
 * institution has one arbitrator — so nothing was rendered, nothing was
 * inferred, and the route was marked static. Every request then tried to
 * prerender it and died on `DYNAMIC_SERVER_USAGE`, including the principal's
 * own slug and the `/arbitrators/*` redirects that exist to keep old links
 * working. Declaring it explicitly is what makes the route survive having no
 * params at build time.
 */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return safeStaticParams(async () => {
    const additional = await listAdditionalArbitrators();
    return additional.map((a) => ({ slug: a.slug }));
  }, "arbitrators");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [arbitrator, principal] = await Promise.all([
    getArbitratorBySlug(slug),
    getPrincipalArbitrator(),
  ]);

  if (!arbitrator) {
    return buildMetadata({
      title: "پروفایل یافت نشد",
      description: "صفحه مورد نظر یافت نشد.",
      path: ROUTES.arbitratorProfile(slug),
      noindex: true,
    });
  }

  /**
   * The principal's slug URL redirects to `/arbitrator`, but `redirect()`
   * inside a streamed page resolves on the client, so a crawler can still see
   * this document. Point the canonical at the real page and keep this URL out
   * of the index so the profile is never indexed twice.
   */
  if (principal && principal.id === arbitrator.id) {
    return buildMetadata({
      title: `${arbitrator.fullName} — ${arbitrator.title}`,
      description: arbitrator.seo.metaDescription,
      path: ROUTES.arbitrator,
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${arbitrator.fullName} — ${arbitrator.title}`,
    description: arbitrator.seo.metaDescription,
    path: ROUTES.arbitratorProfile(arbitrator.slug),
    type: "profile",
    keywords: [arbitrator.fullName, ...arbitrator.expertise],
  });
}

export default async function AdditionalArbitratorPage({ params }: PageProps) {
  const { slug } = await params;
  const [arbitrator, principal] = await Promise.all([
    getArbitratorBySlug(slug),
    getPrincipalArbitrator(),
  ]);

  if (!arbitrator || !arbitrator.published) notFound();

  // One canonical URL per person: the principal lives at `/arbitrator`.
  if (principal && principal.id === arbitrator.id) redirect(ROUTES.arbitrator);

  const settings = await getSettings();
  const hasExperience = arbitrator.yearsOfExperience > 0;

  return (
    <>
      <JsonLd
        data={[
          personJsonLd(arbitrator, { isPrincipal: false }),
          breadcrumbJsonLd([
            { label: "درباره داور", href: ROUTES.arbitrator },
            {
              label: arbitrator.fullName,
              href: ROUTES.arbitratorProfile(arbitrator.slug),
            },
          ]),
        ]}
      />

      <section className="on-navy relative overflow-hidden border-b border-white/10">
        <div
          aria-hidden="true"
          className="grid-lines pointer-events-none absolute inset-0 opacity-70"
        />

        <div className="container-x relative py-8 lg:py-10">
          <Breadcrumbs
            onDark
            items={[
              { label: "درباره داور", href: ROUTES.arbitrator },
              { label: arbitrator.fullName },
            ]}
          />
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
              <p className="eyebrow eyebrow-on-dark">{arbitrator.title}</p>
              <h1 className="display-2 mt-5 text-white">{arbitrator.fullName}</h1>

              {arbitrator.shortBio.trim() && (
                <p className="lead lead-on-dark mt-6 max-w-2xl">
                  {arbitrator.shortBio}
                </p>
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

              {hasExperience && (
                <p className="mt-8 text-[0.9375rem] text-white/60">
                  {faNumber(arbitrator.yearsOfExperience)} سال سابقه حرفه‌ای
                </p>
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

      <div className="section">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-16 lg:col-span-8">
              <section>
                <h2 className="text-[1.25rem] font-bold text-navy-900">معرفی</h2>
                <div className="mt-6">
                  {arbitrator.biography.trim() ? (
                    <RichText source={arbitrator.biography} className="prose-fa" />
                  ) : (
                    <PendingContent label="متن معرفی" />
                  )}
                </div>
              </section>

              {arbitrator.practiceAreas.length > 0 && (
                <section>
                  <h2 className="text-[1.25rem] font-bold text-navy-900">
                    حوزه‌های فعالیت
                  </h2>
                  <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
                    {arbitrator.practiceAreas.map((item, index) => (
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
                        <span className="text-[0.9375rem] leading-[1.95] text-ink-2">
                          {item}
                        </span>
                      </Reveal>
                    ))}
                  </ul>
                </section>
              )}

              {arbitrator.background.length > 0 && (
                <section>
                  <h2 className="text-[1.25rem] font-bold text-navy-900">
                    سوابق حرفه‌ای
                  </h2>
                  <ol className="mt-6 flex flex-col">
                    {arbitrator.background.map((entry, index) => (
                      <Reveal
                        as="li"
                        key={`${entry.title}-${index}`}
                        delay={index * 60}
                        className="flex flex-col gap-1 border-b border-line py-5 first:pt-0 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                      >
                        <div className="min-w-0">
                          <h3 className="text-[1rem] font-semibold text-navy-900">
                            {entry.title}
                          </h3>
                          {entry.institution && (
                            <p className="mt-1 text-[0.875rem] text-muted">
                              {entry.institution}
                            </p>
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
                </section>
              )}

              {arbitrator.approach.trim() && (
                <section>
                  <h2 className="text-[1.25rem] font-bold text-navy-900">
                    رویکرد حرفه‌ای
                  </h2>
                  <RichText source={arbitrator.approach} className="prose-fa mt-6" />
                </section>
              )}
            </div>

            <aside className="lg:col-span-4">
              <div className="surface sticky top-28 p-6">
                <h2 className="text-[1.0625rem] font-bold text-navy-900">
                  ارتباط حرفه‌ای
                </h2>
                <p className="mt-3 text-[0.875rem] leading-[2] text-muted">
                  مکاتبات مربوط به پرونده‌ها از طریق دبیرخانه مؤسسه انجام می‌شود.
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
              </div>
            </aside>
          </div>
        </div>
      </div>

      <CtaBand phone={settings.phones[0]} />
    </>
  );
}
