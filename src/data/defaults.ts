import type {
  AppointmentSettings,
  BrandingSettings,
  CustomCodeSettings,
  FooterSettings,
  HeaderSettings,
  NavLink,
  SeoSettings,
  SmsSettings,
} from "@/types";

/**
 * Shipped defaults for every configuration group.
 *
 * These are the values a brand-new installation starts from and the values the
 * migration backfills into an older snapshot. They are also the *only* place
 * the original hand-built navigation survives — as seed data an administrator
 * can rename, reorder or delete, not as a hard-coded array a component reads.
 */

let sequence = 0;
/** Deterministic ids so a re-seed produces a stable, diff-able snapshot. */
const seedId = (prefix: string) => `${prefix}-${(sequence += 1).toString(36)}`;

const nav = (
  label: string,
  href: string,
  order: number,
  extra: Partial<NavLink> = {},
): NavLink => ({
  id: seedId("nav"),
  label,
  href,
  order,
  visible: true,
  ...extra,
});

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

export const DEFAULT_HEADER: HeaderSettings = {
  logoUrl: "",
  logoHeight: 40,
  showWordmark: true,
  descriptor: "داوری و خدمات حقوقی تخصصی",
  nav: [
    nav("صفحه اصلی", "/", 0),
    nav("درباره مجموعه", "/about", 1),
    nav("داوری", "/arbitration", 2),
    nav("درباره داور", "/arbitrator", 3),
    nav("مقالات", "/articles", 4),
    nav("پرسش‌های متداول", "/faq", 5),
    nav("تماس با ما", "/contact", 6),
  ],
  ctaVisible: true,
  ctaLabel: "رزرو وقت",
  ctaHref: "/appointment",
  style: "classic",
  sticky: true,
  showUtilityBar: true,
  utilityLinks: [nav("پیگیری درخواست", "/tracking", 0)],
  showPhone: true,
  showHours: true,
  mobileMenuEnabled: true,
  mobileCtaLabel: "رزرو وقت مشاوره",
  mobileCtaHref: "/appointment",
  mobileQuickLinks: [
    nav("رزرو وقت مشاوره", "/appointment", 0, {
      description: "انتخاب نوع جلسه، تاریخ و ساعت",
    }),
    nav("پیگیری درخواست", "/tracking", 1, {
      description: "مشاهده وضعیت پرونده با کد پیگیری",
    }),
  ],
};

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

export const DEFAULT_FOOTER: FooterSettings = {
  logoUrl: "",
  showWordmark: true,
  description: "",
  columns: [
    {
      id: seedId("col"),
      title: "بخش‌های سایت",
      order: 0,
      visible: true,
      links: [
        nav("صفحه اصلی", "/", 0),
        nav("درباره مجموعه", "/about", 1),
        nav("داوری", "/arbitration", 2),
        nav("مقالات", "/articles", 3),
        nav("پرسش‌های متداول", "/faq", 4),
        nav("تماس با ما", "/contact", 5),
      ],
    },
  ],
  quickActions: [
    nav("رزرو وقت مشاوره", "/appointment", 0, {
      description: "انتخاب نوع جلسه، تاریخ و ساعت",
    }),
    nav("پیگیری درخواست", "/tracking", 1, {
      description: "مشاهده وضعیت پرونده با کد پیگیری",
    }),
  ],
  legalLinks: [
    nav("سیاست حفظ حریم خصوصی", "/privacy", 0),
    nav("شرایط و قوانین", "/terms", 1),
  ],
  copyright: "© {year} — تمامی حقوق برای {name} محفوظ است.",
  showContactBlock: true,
  showSocials: true,
  showAdminLink: true,
  showNewsletter: false,
  newsletterTitle: "خبرنامه حقوقی",
  newsletterDescription:
    "تازه‌ترین تحلیل‌ها و یادداشت‌های حقوقی مؤسسه را در ایمیل خود دریافت کنید.",
};

/* -------------------------------------------------------------------------- */
/*  Branding                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The designed palette, expressed as editable values.
 *
 * These match the compile-time tokens in `globals.css` exactly, so a fresh
 * install emits no overrides at all and the shipped design is what renders.
 * Changing one here (or in the admin) overrides just that token at runtime.
 */
export const DEFAULT_BRANDING: BrandingSettings = {
  primaryColor: "#0a1428",
  secondaryColor: "#22355a",
  accentColor: "#c8a96a",
  backgroundColor: "#faf9f6",
  surfaceColor: "#ffffff",
  textColor: "#16191f",
  mutedColor: "#6f6b63",
  borderColor: "#e4e0d6",
  fontFamily: "",
  baseFontSize: 16,
  headingScale: 1,
  lineHeight: 1.9,
  cornerRadius: 3,
};

/* -------------------------------------------------------------------------- */
/*  SEO                                                                       */
/* -------------------------------------------------------------------------- */

export const DEFAULT_SEO: SeoSettings = {
  defaultTitle: "داوری، میانجی‌گری و مشاوره حقوقی",
  titleTemplate: "%s | مؤسسه داوری دادآور",
  defaultDescription:
    "مؤسسه داوری دادآور؛ داوری، رسیدگی به اختلافات، میانجی‌گری، مشاوره حقوقی و تنظیم و بررسی قراردادها برای اشخاص و بنگاه‌های اقتصادی.",
  defaultOgImage: "",
  keywords: [
    "داوری",
    "مؤسسه داوری",
    "داور",
    "شرط داوری",
    "میانجی‌گری",
    "مشاوره حقوقی",
    "حل اختلاف",
    "تنظیم قرارداد",
  ],
  indexSite: true,
  followLinks: true,
  sitemapEnabled: true,
  robotsExtra: "",
  twitterHandle: "",
};

/* -------------------------------------------------------------------------- */
/*  Custom code                                                               */
/* -------------------------------------------------------------------------- */

export const DEFAULT_CUSTOM_CODE: CustomCodeSettings = {
  customCss: "",
  customJs: "",
  headScripts: "",
  bodyScripts: "",
  googleAnalyticsId: "",
  googleTagManagerId: "",
  googleSiteVerification: "",
  bingSiteVerification: "",
  enamadHtml: "",
};

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Working week.
 *
 * Index 0 is شنبه and 6 is جمعه — the Iranian week, not the Gregorian one.
 * `@/lib/utils/jalali` converts a JS `Date` into this index.
 */
export const DEFAULT_APPOINTMENTS: AppointmentSettings = {
  enabled: true,
  slotMinutes: 30,
  bufferMinutes: 0,
  maxPerDay: 8,
  leadTimeDays: 1,
  horizonDays: 45,
  days: [
    { day: 0, enabled: true, start: "09:00", end: "18:00" },
    { day: 1, enabled: true, start: "09:00", end: "18:00" },
    { day: 2, enabled: true, start: "09:00", end: "18:00" },
    { day: 3, enabled: true, start: "09:00", end: "18:00" },
    { day: 4, enabled: true, start: "09:00", end: "18:00" },
    { day: 5, enabled: true, start: "09:00", end: "13:00" },
    { day: 6, enabled: false, start: "09:00", end: "13:00" },
  ],
  blockedDates: [],
  types: [
    {
      id: seedId("apt"),
      value: "initial",
      title: "مشاوره اولیه",
      description:
        "بررسی کلی موضوع، تعیین مسیر حقوقی و پاسخ به پرسش‌های مقدماتی شما.",
      durationMinutes: 30,
      feeLabel: "بر اساس تعرفه مصوب مؤسسه",
      modes: ["in-person", "online", "phone"],
      enabled: true,
      order: 0,
    },
    {
      id: seedId("apt"),
      value: "specialised",
      title: "مشاوره تخصصی",
      description:
        "تحلیل عمیق پرونده با حضور داور مؤسسه و بررسی گزینه‌های اجرایی پیش رو.",
      durationMinutes: 60,
      feeLabel: "بر اساس پیچیدگی موضوع",
      modes: ["in-person", "online"],
      enabled: true,
      order: 1,
    },
    {
      id: seedId("apt"),
      value: "arbitration-session",
      title: "جلسه داوری",
      description:
        "جلسه رسمی رسیدگی داوری میان طرفین اختلاف با مدیریت داور مؤسسه.",
      durationMinutes: 90,
      feeLabel: "مطابق موافقت‌نامه داوری",
      modes: ["in-person", "online"],
      enabled: true,
      order: 2,
    },
    {
      id: seedId("apt"),
      value: "contract-review",
      title: "بررسی قرارداد",
      description:
        "مطالعه، ارزیابی ریسک و اصلاح متن قرارداد پیش از امضا یا در جریان اجرا.",
      durationMinutes: 45,
      feeLabel: "بر اساس حجم و نوع قرارداد",
      modes: ["in-person", "online", "phone"],
      enabled: true,
      order: 3,
    },
  ],
  requireApproval: true,
  note: "",
};

/* -------------------------------------------------------------------------- */
/*  SMS                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Default outgoing-SMS behaviour.
 *
 * Nothing is enabled until an administrator turns it on and the provider
 * credentials are present in the environment, so a fresh installation cannot
 * start spending SMS credit by accident.
 *
 * There is no message wording here. sms.ir sends transactional messages
 * through templates registered in its own panel, and the API supplies only
 * parameter values — so what is configured is which template to use and what
 * its parameters are called. The default parameter names match sms.ir's own
 * convention; change them to whatever your registered template declares.
 *
 * Credentials start empty rather than reading the environment at module load:
 * an empty value means "use the environment variable", so an installation
 * configured that way keeps sending, and one configured from the panel does
 * not have its key silently overwritten on the next deploy.
 */
export const DEFAULT_SMS: SmsSettings = {
  enabled: false,
  requirePhoneVerification: true,

  apiKey: "",
  lineNumber: "",

  otpTemplateId: "",
  otpCodeParam: "CODE",

  staffRecipients: [],
  notifyStaffOnAppointment: true,
  staffTemplateId: "",
  staffNameParam: "NAME",
  staffCodeParam: "CODE",

  updateTemplateId: "",
  updateCodeParam: "CODE",
};

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

export const DEFAULT_CATEGORY_SEEDS = [
  {
    slug: "arbitration",
    title: "داوری",
    description: "مبانی، آیین رسیدگی و رویه‌های داوری در حقوق ایران.",
  },
  {
    slug: "commercial-law",
    title: "حقوق تجارت",
    description: "قواعد حاکم بر معاملات، اسناد تجاری و روابط بازرگانی.",
  },
  {
    slug: "contracts",
    title: "قراردادها",
    description: "تنظیم، تفسیر و مدیریت ریسک در قراردادهای تجاری.",
  },
  {
    slug: "dispute-resolution",
    title: "حل اختلاف",
    description: "میانجی‌گری، سازش و روش‌های جایگزین حل‌وفصل اختلافات.",
  },
  {
    slug: "litigation",
    title: "دعاوی",
    description: "راهبردهای طرح و دفاع از دعاوی در مراجع قضایی.",
  },
  {
    slug: "corporate-law",
    title: "حقوق شرکت‌ها",
    description: "حاکمیت شرکتی، اختلافات سهامداران و ساختار سرمایه.",
  },
  {
    slug: "legal-analysis",
    title: "تحلیل‌های حقوقی",
    description: "بررسی رویه قضایی، آرای شاخص و تحولات قانون‌گذاری.",
  },
] as const;
