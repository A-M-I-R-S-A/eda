"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * Tabs across the configuration screens.
 *
 * The advanced tab is only rendered for roles that hold the `advanced`
 * capability, so a settings-capable role never sees a tab that would bounce
 * them to the denied screen.
 */
export function SettingsTabs({ canAdvanced }: { canAdvanced: boolean }) {
  const pathname = usePathname();

  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: ROUTES.admin.settings, label: "عمومی", icon: "settings" },
    { href: ROUTES.admin.branding, label: "هویت بصری", icon: "palette" },
    ...(canAdvanced
      ? [{ href: ROUTES.admin.sms, label: "پیامک", icon: "mail" as IconName }]
      : []),
    ...(canAdvanced
      ? [{ href: ROUTES.admin.advanced, label: "پیشرفته", icon: "code" as IconName }]
      : []),
    {
      href: ROUTES.admin.settingsHistory,
      label: "تاریخچه",
      icon: "history" as IconName,
    },
  ];

  return (
    <nav
      aria-label="بخش‌های تنظیمات"
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
