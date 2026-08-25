"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { HeaderSettings, NavLink } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa, faPhone } from "@/lib/utils/persian";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Sticky site header.
 *
 * Every string, link and toggle here comes from `settings.header`, edited at
 * `/admin/navigation` — there is no hard-coded navigation array anywhere in
 * this file. What the component still owns is *behaviour*:
 *
 *  • A utility strip collapses away once the visitor scrolls — useful context,
 *    not permanent chrome.
 *  • The bar gains a hairline and tightens its height on scroll, so it reads
 *    as "settled" rather than as a floating overlay.
 *  • Below `lg` the navigation moves into a full-height drawer opening from
 *    the right (the RTL leading edge) with a focus trap and scroll lock.
 */

const visible = (links: NavLink[] = []) =>
  [...links].filter((link) => link.visible).sort((a, b) => a.order - b.order);

export function SiteHeader({
  header,
  institutionName,
  institutionShortName,
  phone,
  hoursLabel,
}: {
  header: HeaderSettings;
  institutionName: string;
  institutionShortName: string;
  phone?: string;
  hoursLabel?: string;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const nav = visible(header.nav);
  const utilityLinks = visible(header.utilityLinks);
  const quickLinks = visible(header.mobileQuickLinks);

  /* -- scroll state ------------------------------------------------------ */
  useEffect(() => {
    if (!header.sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [header.sticky]);

  /* -- close the drawer on navigation ------------------------------------ */
  // Derived during render rather than in an effect: React applies it before
  // paint, so the drawer never flashes open on the newly-rendered route.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  /* -- scroll lock + escape + focus trap --------------------------------- */
  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Move focus into the drawer for screen-reader and keyboard users.
    const timer = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    }, 60);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const brand = (size: "sm" | "md") =>
    header.logoUrl ? (
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <Image
          src={header.logoUrl}
          alt={institutionName}
          width={Math.round(header.logoHeight * 4)}
          height={header.logoHeight}
          style={{ height: header.logoHeight, width: "auto" }}
          className="object-contain"
          priority
        />
        {header.showWordmark && (
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-[0.9375rem] font-bold text-navy-950">
              {institutionName}
            </span>
            {header.descriptor && (
              <span className="truncate text-[0.6875rem] text-muted">
                {header.descriptor}
              </span>
            )}
          </span>
        )}
      </Link>
    ) : (
      <Logo
        name={institutionName}
        shortName={institutionShortName}
        descriptor={header.descriptor}
        size={size}
        className="min-w-0 flex-1 lg:flex-none"
      />
    );

  const showUtility =
    header.showUtilityBar &&
    (utilityLinks.length > 0 ||
      (header.showPhone && phone) ||
      (header.showHours && hoursLabel));

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[60] focus:rounded-sm focus:bg-navy-900 focus:px-4 focus:py-2.5 focus:text-sm focus:text-white"
      >
        رفتن به محتوای اصلی
      </a>

      <header
        className={cn(
          "z-50 w-full transition-[box-shadow,background-color] duration-400 ease-[var(--ease-in-out-soft)]",
          header.sticky && "sticky top-0",
          header.style === "minimal" && "bg-paper",
          header.style === "bordered" && "border-b-2 border-navy-900 bg-paper",
          header.style === "classic" &&
            (scrolled
              ? "border-b border-line bg-paper/92 shadow-[0_1px_20px_-10px_rgba(10,20,40,0.35)] backdrop-blur-md"
              : "border-b border-line/70 bg-paper"),
        )}
      >
        {/* utility strip */}
        {showUtility && (
          <div
            className={cn(
              "hidden overflow-hidden border-b border-line/70 bg-paper-2/60 transition-[max-height,opacity] duration-400 ease-[var(--ease-in-out-soft)] lg:block",
              scrolled ? "max-h-0 opacity-0" : "max-h-12 opacity-100",
            )}
          >
            <div className="container-x flex h-10 items-center justify-between text-[0.75rem] text-muted">
              <div className="flex items-center gap-6">
                {header.showPhone && phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-navy-800"
                  >
                    <Icon name="phone" size={14} className="text-gold-600" />
                    <span dir="ltr" className="font-medium">
                      {faPhone(phone)}
                    </span>
                  </a>
                )}
                {header.showHours && hoursLabel && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="clock" size={14} className="text-gold-600" />
                    {hoursLabel}
                  </span>
                )}
              </div>

              {utilityLinks.length > 0 && (
                <div className="flex items-center gap-5">
                  {utilityLinks.map((link, index) => (
                    <span key={link.id} className="flex items-center gap-5">
                      {index > 0 && (
                        <span aria-hidden="true" className="h-3 w-px bg-line-2" />
                      )}
                      <Link
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        className="transition-colors hover:text-navy-800"
                      >
                        {link.label}
                      </Link>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* main bar */}
        <div
          className={cn(
            "container-x flex items-center justify-between gap-6 transition-[height] duration-400 ease-[var(--ease-in-out-soft)]",
            scrolled ? "h-[4.25rem] lg:h-[4.5rem]" : "h-[4.5rem] lg:h-[5.25rem]",
          )}
        >
          {brand(scrolled ? "sm" : "md")}

          {nav.length > 0 && (
            <nav aria-label="ناوبری اصلی" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {nav.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-10 items-center rounded-xs px-3 text-[0.875rem] font-medium transition-colors duration-250",
                          active ? "text-navy-950" : "text-ink-2 hover:text-navy-900",
                        )}
                      >
                        {item.label}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-x-3 bottom-1 h-px origin-right bg-gold-500 transition-transform duration-400 ease-[var(--ease-out-quint)]",
                            active ? "scale-x-100" : "scale-x-0",
                          )}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-2.5">
            {/* Responsive visibility lives on a wrapper, not on the button:
                putting `hidden` in the button's own class list collides with
                the `inline-flex` in its base styles, and which one wins is
                decided by Tailwind's utility ordering rather than by us. */}
            {header.ctaVisible && header.ctaLabel && header.ctaHref && (
              <span className="hidden sm:block">
                <ButtonLink
                  href={header.ctaHref}
                  variant="primary"
                  size="sm"
                  className="lg:min-h-11 lg:px-5 lg:text-[0.9375rem]"
                >
                  {header.ctaLabel}
                </ButtonLink>
              </span>
            )}

            {phone && (
              <a
                href={`tel:${phone}`}
                aria-label={`تماس تلفنی با ${institutionName}`}
                className="flex size-11 items-center justify-center rounded-sm border border-line-2 text-navy-800 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white sm:hidden"
              >
                <Icon name="phone" size={18} />
              </a>
            )}

            {header.mobileMenuEnabled && (
              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-drawer"
                aria-label={open ? "بستن منو" : "باز کردن منو"}
                className="flex size-11 items-center justify-center rounded-sm border border-line-2 text-navy-900 transition-colors hover:border-navy-900 lg:hidden"
              >
                <Icon name={open ? "close" : "menu"} size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/*  Mobile drawer                                                    */}
      {/* ---------------------------------------------------------------- */}
      {header.mobileMenuEnabled && (
        <div
          aria-hidden={!open}
          className={cn(
            // `overflow-hidden` clips the closed (translated-off) panel.
            // Without it the panel parks outside the viewport and widens the
            // document, which reads as a broken horizontal scroll on mobile.
            "fixed inset-0 z-[55] overflow-hidden lg:hidden",
            open ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
            className={cn(
              "absolute inset-0 bg-navy-950/45 backdrop-blur-[2px] transition-opacity duration-400",
              open ? "opacity-100" : "opacity-0",
            )}
          />

          <div
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal={open || undefined}
            aria-label="منوی اصلی"
            className={cn(
              "absolute inset-y-0 start-0 flex w-[min(21rem,88vw)] flex-col bg-paper shadow-2xl",
              "transition-transform duration-450 ease-[var(--ease-out-quint)]",
              open ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-line px-5">
              <Logo
                name={institutionName}
                shortName={institutionShortName}
                descriptor={header.descriptor}
                size="sm"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن منو"
                className="flex size-10 items-center justify-center rounded-sm border border-line-2 text-navy-900"
              >
                <Icon name="close" size={19} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {nav.length > 0 && (
                <nav aria-label="ناوبری موبایل" className="px-5 py-4">
                  <ul className="flex flex-col">
                    {nav.map((item, index) => {
                      const active = isActive(item.href);
                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noopener noreferrer" : undefined}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 border-b border-line/80 py-4 text-[0.9375rem] transition-colors",
                              active
                                ? "font-semibold text-navy-950"
                                : "font-medium text-ink-2",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "w-6 text-[0.6875rem] tabular-nums",
                                active ? "text-gold-600" : "text-muted-2",
                              )}
                            >
                              {fa(String(index + 1).padStart(2, "0"))}
                            </span>
                            {item.label}
                            {active && (
                              <span className="ms-auto size-1.5 rounded-full bg-gold-500" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}

              {quickLinks.length > 0 && (
                <div className="px-5 pb-5">
                  <p className="mb-3 text-[0.75rem] font-semibold text-muted">
                    دسترسی سریع
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {quickLinks.map((action) => (
                      <Link
                        key={action.id}
                        href={action.href}
                        className="surface group flex items-start justify-between gap-3 rounded-sm p-4 transition-colors hover:border-navy-400"
                      >
                        <span className="min-w-0">
                          <span className="block text-[0.9375rem] font-semibold text-navy-900">
                            {action.label}
                          </span>
                          {action.description && (
                            <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted">
                              {action.description}
                            </span>
                          )}
                        </span>
                        <Icon
                          name="arrow-forward"
                          size={17}
                          className="mt-1 shrink-0 text-gold-600 transition-transform duration-400 group-hover:-translate-x-1"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(header.mobileCtaLabel || phone) && (
              <div className="shrink-0 border-t border-line bg-paper-2/70 p-5">
                {header.mobileCtaLabel && header.mobileCtaHref && (
                  <ButtonLink
                    href={header.mobileCtaHref}
                    variant="primary"
                    size="lg"
                    block
                  >
                    {header.mobileCtaLabel}
                  </ButtonLink>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="mt-3 flex items-center justify-center gap-2 text-[0.875rem] font-medium text-navy-800"
                  >
                    <Icon name="phone" size={16} className="text-gold-600" />
                    <span dir="ltr">{faPhone(phone)}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
