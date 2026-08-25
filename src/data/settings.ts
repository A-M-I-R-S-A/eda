import type { SiteSettings } from "@/types";
import {
  DEFAULT_APPOINTMENTS,
  DEFAULT_SMS,
  DEFAULT_BRANDING,
  DEFAULT_CUSTOM_CODE,
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_SEO,
} from "./defaults";

/**
 * Institution profile.
 *
 * ⚠️ PLACEHOLDER DATA — the name, registration number, phones, address and
 * coordinates below are illustrative and must be replaced with the
 * institution's real information before launch. The admin panel at
 * `/admin/settings` edits this record at runtime.
 *
 * Two things are deliberately *absent* rather than placeheld:
 *
 *  • **Statistics.** There is no counters/stats block anywhere in the model.
 *    Case counts, years of experience and similar figures are claims about a
 *    real institution; inventing them to fill a band is not acceptable, so the
 *    band was removed rather than seeded.
 *
 *  • **The notary office.** `notaryOffice` ships disabled and empty. It is a
 *    legally distinct entity belonging to a *different* person and is never
 *    merged into the institution's own contact details.
 */
export const SEED_SETTINGS: SiteSettings = {
  id: "site",
  institutionName: "مؤسسه داوری دادآور",
  institutionShortName: "دادآور",
  tagline: "داوری و حل‌وفصل تخصصی اختلافات",
  description:
    "مؤسسه داوری دادآور، مرجعی تخصصی برای رسیدگی به اختلافات اشخاص حقیقی و حقوقی در چارچوب مقررات داوری ایران است؛ داوری، رسیدگی به اختلافات، میانجی‌گری، مشاوره حقوقی و بررسی قراردادها با محوریت داور مؤسسه.",
  logoUrl: "",
  faviconUrl: "",
  language: "fa-IR",
  direction: "rtl",
  phones: ["02191012345", "09121234567"],
  mobile: "09121234567",
  email: "info@dadavar-law.ir",
  address:
    "تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه دوازدهم، واحد ۱۲۰۴",
  postalCode: "1969764591",
  mapEmbedUrl:
    "https://www.openstreetmap.org/export/embed.html?bbox=51.3960%2C35.7550%2C51.4160%2C35.7690&layer=mapnik&marker=35.7620%2C51.4060",
  mapLat: 35.762,
  mapLng: 51.406,
  workingHours: [
    { label: "شنبه تا چهارشنبه", value: "۹:۰۰ تا ۱۸:۰۰" },
    { label: "پنجشنبه", value: "۹:۰۰ تا ۱۳:۰۰" },
    { label: "جمعه و تعطیلات رسمی", value: "تعطیل" },
    { label: "جلسات آنلاین", value: "با هماهنگی قبلی خارج از ساعات اداری" },
  ],
  socials: [
    { platform: "linkedin", label: "لینکدین", url: "https://www.linkedin.com/" },
    { platform: "instagram", label: "اینستاگرام", url: "https://www.instagram.com/" },
    { platform: "telegram", label: "تلگرام", url: "https://t.me/" },
    { platform: "whatsapp", label: "واتس‌اپ", url: "https://wa.me/989121234567" },
  ],
  registrationNumber: "۱۲۴۵۷",

  /**
   * Configuration groups.
   *
   * Each ships with the values the site was designed around, so a fresh
   * install renders exactly as intended — and every one of them is editable
   * from its own admin screen without touching this file again.
   */
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
  branding: DEFAULT_BRANDING,
  seo: DEFAULT_SEO,
  customCode: DEFAULT_CUSTOM_CODE,
  appointments: DEFAULT_APPOINTMENTS,
  sms: DEFAULT_SMS,

  /**
   * A separate professional entity. Nothing renders while `enabled` is false,
   * and the fields stay empty until real, supplied details are entered — the
   * notary's name in particular is never inferred.
   */
  notaryOffice: {
    enabled: false,
    officeName: "",
    notaryName: "",
    phone: "",
    address: "",
    note: "",
  },

  createdAt: "2024-01-10T08:00:00.000Z",
  updatedAt: "2026-06-01T08:00:00.000Z",
};
