"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { ROUTES } from "@/lib/config/routes";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * Channel switcher for the submissions inbox.
 *
 * Every public form feeds one of these tabs, so an administrator has a single
 * place to check rather than four scattered screens.
 */
export function FormsTabs({
  counts,
}: {
  counts: { messages: number; requests: number; appointments: number; newsletter: number };
}) {
  const pathname = usePathname();

  const tabs: { href: string; label: string; icon: IconName; count: number }[] = [
    {
      href: ROUTES.admin.messages,
      label: "پیام‌های تماس",
      icon: "mail",
      count: counts.messages,
    },
    {
      href: ROUTES.admin.requests,
      label: "درخواست‌های مشاوره",
      icon: "inbox",
      count: counts.requests,
    },
    {
      href: ROUTES.admin.appointments,
      label: "رزرو نوبت",
      icon: "calendar",
      count: counts.appointments,
    },
    {
      href: ROUTES.admin.newsletter,
      label: "خبرنامه",
      icon: "send",
      count: counts.newsletter,
    },
  ];

  return (
    <nav
      aria-label="کانال‌های دریافت فرم"
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[0.875rem] font-medium transition-colors",
              active
                ? "border-navy-900 text-navy-950"
                : "border-transparent text-muted hover:text-navy-800",
            )}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold tabular-nums",
                  active ? "bg-navy-900 text-white" : "bg-paper-2 text-muted",
                )}
              >
                {fa(tab.count)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
