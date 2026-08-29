import Link from "next/link";
import Image from "next/image";
import type { NavLink, SiteSettings } from "@/types";
import { fa, faPhone } from "@/lib/utils/persian";
import { toJalali } from "@/lib/utils/jalali";
import { ROUTES } from "@/lib/config/routes";
import { SOCIAL_PLATFORM } from "@/lib/config/labels";
import { Monogram, Wordmark } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";
import { NewsletterForm } from "@/components/forms/newsletter-form";

/**
 * Site footer.
 *
 * Columns, links, quick actions, the legal strip and the copyright line are
 * all `settings.footer` records edited at `/admin/navigation/footer`. The one
 * Every list is a CMS record: columns, quick actions and legal links are all
 * edited at `/admin/navigation/footer`.
 */

const visible = (links: NavLink[] = []) =>
  [...links].filter((link) => link.visible).sort((a, b) => a.order - b.order);

function FooterColumnBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h2 className="mb-5 text-[0.8125rem] font-semibold text-gold-300">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "group inline-flex items-center gap-2 text-[0.875rem] leading-[2.4] text-white/62 transition-colors duration-250 hover:text-white";

  if (external) {
    return (
      <a href={href} className={className} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <span
        aria-hidden="true"
        className="h-px w-0 bg-gold-400 transition-all duration-400 ease-[var(--ease-out-quint)] group-hover:w-3"
      />
      {children}
    </Link>
  );
}

export function SiteFooter({
  settings,
  csrfToken,
}: {
  settings: SiteSettings;
  /** Required only when the newsletter block is switched on. */
  csrfToken?: string;
}) {
  const footer = settings.footer;
  const jalaliYear = toJalali(new Date()).jy;

  const columns = [...(footer.columns ?? [])]
    .filter((column) => column.visible)
    .sort((a, b) => a.order - b.order);
  const quickActions = visible(footer.quickActions);
  const legalLinks = visible(footer.legalLinks);

  /**
   * The copyright line is a template so an administrator can restate it
   * without losing the year, which has to stay dynamic.
   */
  const copyright = (footer.copyright || "© {year} — {name}")
    .replace("{year}", fa(jalaliYear))
    .replace("{name}", settings.institutionName);

  // Columns share the grid with identity and contact, so the width of each
  // depends on how many blocks are actually switched on.
  const secondaryBlocks = columns.length + (footer.showContactBlock ? 1 : 0);

  return (
    <footer className="on-navy relative overflow-hidden">
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0 opacity-60"
      />

      <div className="relative">
        {/* -- primary ---------------------------------------------------- */}
        <div className="container-x grid gap-12 py-14 md:grid-cols-2 md:py-16 lg:grid-cols-12 lg:gap-10 lg:py-20">
          {/* identity */}
          <div className={secondaryBlocks > 2 ? "lg:col-span-4" : "lg:col-span-5"}>
            {/*
              An uploaded logo replaces the *monogram*, not the name.

              Nesting the wordmark inside the no-logo branch — as this did —
              made "نمایش نام مؤسسه" silently do nothing the moment a logo was
              assigned, so an institution whose logo is a mark rather than a
              lockup lost its name from the footer with no way to get it back.
              The header has always treated the two independently; this matches.

              When the name is written out beside it, the image is decorative
              and its alt text would only repeat what the wordmark already says.
            */}
            <div className="flex items-center gap-3">
              {footer.logoUrl ? (
                <Image
                  src={footer.logoUrl}
                  alt={footer.showWordmark ? "" : settings.institutionName}
                  width={180}
                  height={44}
                  style={{ height: 44, width: "auto" }}
                  className="object-contain"
                />
              ) : (
                <Monogram size={40} tone="light" />
              )}

              {footer.showWordmark && (
                <>
                  <span aria-hidden="true" className="h-9 w-px bg-white/15" />
                  <Wordmark
                    name={settings.institutionName}
                    descriptor={
                      settings.registrationNumber
                        ? `شماره ثبت ${settings.registrationNumber}`
                        : undefined
                    }
                    tone="light"
                  />
                </>
              )}
            </div>

            <p className="mt-6 max-w-sm text-[0.9375rem] leading-[2.1] text-white/60">
              {footer.description || settings.description}
            </p>

            {footer.showSocials && settings.socials.length > 0 && (
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                {settings.socials.map((social) => {
                  const meta = SOCIAL_PLATFORM[social.platform];
                  return (
                    <a
                      key={`${social.platform}-${social.url}`}
                      href={social.url}
                      aria-label={social.label || meta?.label}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="flex size-10 items-center justify-center rounded-sm border border-white/12 text-white/70 transition-colors duration-250 hover:border-gold-400/60 hover:bg-white/[0.04] hover:text-gold-200"
                    >
                      <Icon name={meta?.icon ?? "globe"} size={17} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* administrator-defined columns */}
          {columns.map((column) => (
            <div key={column.id} className="lg:col-span-2">
              <FooterColumnBlock title={column.title}>
                <ul className="flex flex-col">
                  {visible(column.links).map((link) => (
                    <li key={link.id}>
                      <FooterLink href={link.href} external={link.external}>
                        {link.label}
                      </FooterLink>
                    </li>
                  ))}
                </ul>
              </FooterColumnBlock>
            </div>
          ))}

          {/* contact */}
          {footer.showContactBlock && (
            <div className="lg:col-span-3">
              <FooterColumnBlock title="ارتباط با ما">
                <ul className="flex flex-col gap-4 text-[0.875rem] text-white/62">
                  {settings.address && (
                    <li className="flex items-start gap-3">
                      <Icon
                        name="map-pin"
                        size={17}
                        className="mt-1 shrink-0 text-gold-400"
                      />
                      <span className="leading-[2]">{settings.address}</span>
                    </li>
                  )}

                  {settings.phones.length > 0 && (
                    <li className="flex items-start gap-3">
                      <Icon
                        name="phone"
                        size={17}
                        className="mt-1 shrink-0 text-gold-400"
                      />
                      <span className="flex flex-col gap-0.5">
                        {settings.phones.map((phone) => (
                          <a
                            key={phone}
                            href={`tel:${phone}`}
                            dir="ltr"
                            className="text-start font-medium transition-colors hover:text-white"
                          >
                            {faPhone(phone)}
                          </a>
                        ))}
                      </span>
                    </li>
                  )}

                  {settings.email && (
                    <li className="flex items-start gap-3">
                      <Icon
                        name="mail"
                        size={17}
                        className="mt-1 shrink-0 text-gold-400"
                      />
                      <a
                        href={`mailto:${settings.email}`}
                        dir="ltr"
                        className="transition-colors hover:text-white"
                      >
                        {settings.email}
                      </a>
                    </li>
                  )}

                  {settings.workingHours.length > 0 && (
                    <li className="flex items-start gap-3">
                      <Icon
                        name="clock"
                        size={17}
                        className="mt-1 shrink-0 text-gold-400"
                      />
                      <span className="flex flex-col gap-0.5 leading-[2]">
                        {settings.workingHours.slice(0, 2).map((hour) => (
                          <span key={hour.label}>
                            {hour.label}: {hour.value}
                          </span>
                        ))}
                      </span>
                    </li>
                  )}
                </ul>
              </FooterColumnBlock>
            </div>
          )}
        </div>

        {/* -- newsletter --------------------------------------------------- */}
        {footer.showNewsletter && csrfToken && (
          <div className="container-x">
            <div className="hairline-dark" />
            <div className="flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
              <div className="max-w-md">
                <h2 className="text-[1.0625rem] font-bold text-white">
                  {footer.newsletterTitle || "خبرنامه"}
                </h2>
                {footer.newsletterDescription && (
                  <p className="mt-2 text-[0.875rem] leading-[2] text-white/55">
                    {footer.newsletterDescription}
                  </p>
                )}
              </div>

              <div className="w-full lg:max-w-md">
                <NewsletterForm csrfToken={csrfToken} source="footer" onDark />
              </div>
            </div>
          </div>
        )}

        {/* -- quick actions ---------------------------------------------- */}
        {quickActions.length > 0 && (
          <div className="container-x">
            <div className="hairline-dark" />
            <div className="grid gap-px bg-white/10 py-0 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="group flex items-center justify-between gap-4 bg-navy-900 px-1 py-6 transition-colors duration-300 hover:bg-navy-800 sm:px-6"
                >
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-semibold text-white">
                      {action.label}
                    </span>
                    {action.description && (
                      <span className="mt-1 block text-[0.8125rem] text-white/50">
                        {action.description}
                      </span>
                    )}
                  </span>
                  <Icon
                    name="arrow-forward"
                    size={18}
                    className="shrink-0 text-gold-400 transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:-translate-x-1.5"
                  />
                </Link>
              ))}
            </div>
            <div className="hairline-dark" />
          </div>
        )}

        {/* -- legal ------------------------------------------------------- */}
        <div className="container-x flex flex-col-reverse items-center justify-between gap-5 py-7 text-[0.8125rem] text-white/45 md:flex-row">
          <p>{copyright}</p>

          {(legalLinks.length > 0 || footer.showAdminLink) && (
            <nav aria-label="پیوندهای حقوقی">
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {legalLinks.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="transition-colors duration-250 hover:text-white/80"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {footer.showAdminLink && (
                  <li>
                    <Link
                      href={ROUTES.admin.login}
                      className="transition-colors duration-250 hover:text-white/80"
                    >
                      ورود مدیریت
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
