"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { Icon, type IconName } from "@/components/ui/icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: ROUTES.admin.navigation, label: "هدر و منوی اصلی", icon: "link" },
  { href: ROUTES.admin.footer, label: "فوتر", icon: "columns" },
];

export function NavigationTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="بخش‌های ناوبری"
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {TABS.map((tab) => {
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
