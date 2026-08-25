import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { Monogram } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "صفحه یافت نشد",
  robots: { index: false, follow: false },
};

/**
 * Global 404.
 *
 * Self-contained so it renders even outside the site shell, but its links and
 * institution name still come from the CMS — a 404 that names a brand the
 * administrator has since renamed is its own small bug.
 */
export default async function NotFound() {
  const settings = await getSettings();
  const { header, footer } = settings;

  const navLinks = [...header.nav]
    .filter((link) => link.visible && link.href !== "/")
    .sort((a, b) => a.order - b.order);

  const quickActions = [...footer.quickActions]
    .filter((link) => link.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="on-navy relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0 opacity-70"
      />

      <header className="container-x relative py-7">
        <Link href={ROUTES.home} className="inline-flex items-center gap-3">
          <Monogram size={36} tone="light" />
          <span className="text-[1.0625rem] font-bold text-white">
            {settings.institutionName}
          </span>
        </Link>
      </header>

      <main className="container-x relative flex flex-1 items-center py-16">
        <div className="grid w-full gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow eyebrow-on-dark">خطای ۴۰۴</p>

            <h1 className="display-1 mt-6 text-white">
              این صفحه پیدا نشد
            </h1>

            <p className="lead lead-on-dark mt-6 max-w-xl">
              ممکن است نشانی را اشتباه وارد کرده باشید یا صفحه جابه‌جا شده باشد.
              از مسیرهای زیر می‌توانید ادامه دهید.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href={ROUTES.home}
                variant="accent"
                size="lg"
                iconEnd="arrow-forward"
              >
                بازگشت به صفحه اصلی
              </ButtonLink>
              <ButtonLink href={ROUTES.contact} variant="outline-light" size="lg">
                تماس با ما
              </ButtonLink>
            </div>

            {navLinks.length > 0 && (
            <nav aria-label="پیوندهای مفید" className="mt-12">
              <p className="text-[0.8125rem] font-semibold text-gold-300">
                بخش‌های پرمراجعه
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2.5">
                {navLinks.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="text-[0.875rem] text-white/60 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            )}
          </div>

          <div className="lg:col-span-5">
            <ul className="flex flex-col gap-px bg-white/10">
              {quickActions.map((action) => (
                <li key={action.id}>
                  <Link
                    href={action.href}
                    className="group flex items-center justify-between gap-4 bg-navy-900 px-6 py-6 transition-colors duration-300 hover:bg-navy-800"
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-semibold text-white">
                        {action.label}
                      </span>
                      <span className="mt-1 block text-[0.8125rem] text-white/50">
                        {action.description}
                      </span>
                    </span>
                    <Icon
                      name="arrow-forward"
                      size={18}
                      className="shrink-0 text-gold-400 transition-transform duration-400 group-hover:-translate-x-1.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
