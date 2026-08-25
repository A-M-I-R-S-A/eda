"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionPayload } from "@/types";
import { cn } from "@/lib/utils/cn";
import { ADMIN_NAV, ROUTES } from "@/lib/config/routes";
import { USER_ROLE } from "@/lib/config/labels";
import { can } from "@/lib/auth/permissions";
import { logoutAction } from "@/lib/actions/auth";
import { Monogram } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";

/**
 * Admin chrome: navy rail + light workspace.
 *
 * The rail is filtered by capability, so a manager simply never sees the
 * content groups and an editor never sees settings — the same matrix that
 * guards the server actions decides what is rendered, rather than a second,
 * drifting copy of the rules.
 *
 * The rail is fixed on `lg` and becomes an overlay drawer below it, with the
 * usual scroll lock and Escape handling.
 */
export function AdminShell({
  session,
  badges,
  children,
}: {
  session: SessionPayload;
  /** Optional counters rendered beside nav items, keyed by href. */
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Derived during render rather than in an effect: React applies it before
  // paint, so the drawer never flashes open on the newly-rendered route.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string, match?: string) => {
    if (href === ROUTES.admin.root) return pathname === href;
    return pathname.startsWith(match ?? href);
  };

  const groups = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || can(session, item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  const rail = (
    <div className="flex h-full flex-col bg-navy-950">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/8 px-5">
        <Link href={ROUTES.admin.root} className="flex items-center gap-2.5">
          <Monogram size={30} tone="light" />
          <span className="flex flex-col">
            <span className="text-[0.875rem] font-bold text-white">
              پنل مدیریت
            </span>
            <span className="text-[0.625rem] text-white/40">
              مدیریت محتوای وب‌سایت
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="بستن منو"
          className="flex size-9 items-center justify-center rounded-sm text-white/60 hover:bg-white/10 lg:hidden"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <nav aria-label="ناوبری پنل مدیریت" className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[0.6875rem] font-semibold text-white/30">
              {group.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.match);
                const badge = badges?.[item.href];

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-sm px-3 py-2.5 text-[0.875rem] transition-colors duration-200",
                        active
                          ? "bg-white/10 font-semibold text-white"
                          : "text-white/60 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <Icon
                        name={item.icon}
                        size={17}
                        className={active ? "text-gold-300" : "text-white/45"}
                      />
                      <span className="flex-1">{item.label}</span>
                      {badge ? (
                        <span className="flex min-w-5 items-center justify-center rounded-full bg-gold-400 px-1.5 py-0.5 text-[0.625rem] font-bold text-navy-950 tabular-nums">
                          {new Intl.NumberFormat("fa-IR").format(badge)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/8 p-3">
        <Link
          href={ROUTES.home}
          target="_blank"
          className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-[0.8125rem] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Icon name="external" size={16} className="text-white/40" />
          مشاهده وب‌سایت
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper-2/60">
      {/* fixed rail */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[16.5rem] lg:block">
        {rail}
      </aside>

      {/* drawer */}
      <div
        aria-hidden={!open}
        className={cn(
          // Clips the closed drawer so it cannot widen the document.
          "fixed inset-0 z-50 overflow-hidden lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="بستن منو"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-navy-950/55 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal={open || undefined}
          aria-label="منوی مدیریت"
          className={cn(
            "absolute inset-y-0 start-0 w-[16.5rem] transition-transform duration-400 ease-[var(--ease-out-quint)]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          {rail}
        </div>
      </div>

      {/* workspace */}
      <div className="lg:ms-[16.5rem]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={open}
            className="flex size-10 items-center justify-center rounded-sm border border-line-2 text-navy-900 lg:hidden"
          >
            <Icon name="menu" size={19} />
          </button>

          <p className="hidden text-[0.875rem] text-muted lg:block">
            خوش آمدید،{" "}
            <span className="font-semibold text-navy-900">{session.name}</span>
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-sm border border-line px-3 py-1.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-navy-900 text-[0.6875rem] font-bold text-gold-200">
                {session.name.trim().slice(0, 1)}
              </span>
              <span className="hidden flex-col sm:flex">
                <span className="text-[0.75rem] font-semibold leading-tight text-navy-900">
                  {session.name}
                </span>
                <span className="text-[0.625rem] leading-tight text-muted">
                  {USER_ROLE[session.role]}
                </span>
              </span>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-10 items-center gap-2 rounded-sm border border-line-2 px-3.5 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
              >
                <Icon name="logout" size={16} />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </form>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
