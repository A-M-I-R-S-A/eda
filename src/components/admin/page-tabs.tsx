"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Page } from "@/types";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * Tabs across a page's editing surfaces.
 *
 * Settings, content and history are genuinely separate tasks; putting them on
 * one screen would produce a form long enough that the save button is never in
 * view alongside the field being edited.
 */
export function PageTabs({ page }: { page: Page }) {
  const pathname = usePathname();

  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: ROUTES.admin.pageSections(page.id), label: "بخش‌ها", icon: "layers" },
    { href: ROUTES.admin.pageEdit(page.id), label: "تنظیمات و سئو", icon: "settings" },
    { href: ROUTES.admin.pageRevisions(page.id), label: "تاریخچه", icon: "history" },
  ];

  return (
    <nav
      aria-label="بخش‌های ویرایش صفحه"
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
          </Link>
        );
      })}
    </nav>
  );
}
