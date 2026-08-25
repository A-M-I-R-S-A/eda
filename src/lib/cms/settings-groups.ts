/**
 * The configuration groups settings are versioned under.
 *
 * Each group is snapshotted and restored independently, so rolling back the
 * footer cannot disturb the header — which matters, because settings have no
 * draft step and every save is live on every page the moment it lands.
 */

export const SETTINGS_GROUPS = [
  "general",
  "header",
  "footer",
  "branding",
  "seo",
  "customCode",
  "appointments",
  "sms",
] as const;

export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

export const SETTINGS_GROUP_LABEL: Record<SettingsGroup, string> = {
  general: "تنظیمات عمومی",
  header: "هدر و منوی اصلی",
  footer: "فوتر",
  branding: "هویت بصری",
  seo: "سئو",
  customCode: "کدها و تنظیمات پیشرفته",
  appointments: "نوبت‌دهی",
  sms: "پیامک",
};

export function isSettingsGroup(value: unknown): value is SettingsGroup {
  return (
    typeof value === "string" &&
    (SETTINGS_GROUPS as readonly string[]).includes(value)
  );
}
