import type { Permission } from "@/lib/auth/permissions";

/**
 * Single source of truth for the site's URL structure.
 *
 * Routes stay ASCII (clean, canonical, log-friendly) while every *label* is
 * Persian. Public navigation is no longer declared here — the header, footer
 * and their link lists are CMS records edited at `/admin/navigation`, so this
 * file describes only routes the application itself owns.
 */

export const ROUTES = {
  home: "/",
  about: "/about",
  services: "/services",
  service: (slug: string) => `/services/${slug}`,
  arbitration: "/arbitration",
  /**
   * The institution has ONE arbitrator, so the canonical profile lives at a
   * singular, slug-less path. `arbitratorProfile` exists for the case where
   * the institution later grows: additional records get their own page
   * without the primary route changing.
   */
  arbitrator: "/arbitrator",
  arbitratorProfile: (slug: string) => `/arbitrator/${slug}`,
  articles: "/articles",
  article: (slug: string) => `/articles/${slug}`,
  articleCategory: (slug: string) => `/articles?category=${slug}`,
  faq: "/faq",
  contact: "/contact",
  consultation: "/consultation",
  appointment: "/appointment",
  tracking: "/tracking",
  trackingResult: (code: string) => `/tracking?code=${encodeURIComponent(code)}`,
  privacy: "/privacy",
  terms: "/terms",
  /** CMS-authored page. */
  page: (slug: string) => `/${slug}`,

  admin: {
    root: "/admin",
    login: "/admin/login",
    denied: "/admin/denied",

    pages: "/admin/pages",
    pageNew: "/admin/pages/new",
    pageEdit: (id: string) => `/admin/pages/${id}`,
    pageSections: (id: string) => `/admin/pages/${id}/sections`,
    pageSeo: (id: string) => `/admin/pages/${id}/seo`,
    pageRevisions: (id: string) => `/admin/pages/${id}/revisions`,

    media: "/admin/media",

    articles: "/admin/articles",
    articleNew: "/admin/articles/new",
    articleEdit: (id: string) => `/admin/articles/${id}`,
    articleRevisions: (id: string) => `/admin/articles/${id}/revisions`,

    categories: "/admin/categories",

    services: "/admin/services",
    serviceNew: "/admin/services/new",
    serviceEdit: (id: string) => `/admin/services/${id}`,
    serviceRevisions: (id: string) => `/admin/services/${id}/revisions`,

    arbitrators: "/admin/arbitrators",
    arbitratorNew: "/admin/arbitrators/new",
    arbitratorEdit: (id: string) => `/admin/arbitrators/${id}`,

    testimonials: "/admin/testimonials",

    faq: "/admin/faq",
    faqNew: "/admin/faq/new",
    faqEdit: (id: string) => `/admin/faq/${id}`,

    forms: "/admin/forms",
    messages: "/admin/forms/messages",
    newsletter: "/admin/forms/newsletter",
    requests: "/admin/requests",
    request: (id: string) => `/admin/requests/${id}`,

    appointments: "/admin/appointments",
    appointment: (id: string) => `/admin/appointments/${id}`,
    appointmentCalendar: "/admin/appointments/calendar",
    appointmentSettings: "/admin/appointments/settings",

    navigation: "/admin/navigation",
    footer: "/admin/navigation/footer",
    settings: "/admin/settings",
    branding: "/admin/settings/branding",
    seo: "/admin/seo",
    advanced: "/admin/settings/advanced",
    sms: "/admin/settings/sms",
    settingsHistory: "/admin/settings/history",

    users: "/admin/users",
    userNew: "/admin/users/new",
    userEdit: (id: string) => `/admin/users/${id}`,
    audit: "/admin/audit",
  },
} as const;

/**
 * Public URL of an arbitrator's profile.
 *
 * The institution's single arbitrator is canonical at `/arbitrator`; any
 * further record added later gets its own slug page. Keeping the branch in one
 * helper stops call sites from guessing.
 */
export function arbitratorPublicHref(slug: string, isPrincipal: boolean): string {
  return isPrincipal ? ROUTES.arbitrator : ROUTES.arbitratorProfile(slug);
}

/**
 * Routes the CMS may not hand to a page slug, because a hand-built route
 * already owns them. Validation rejects a page slug that collides with one.
 */
export const RESERVED_SLUGS: string[] = [
  // Application areas.
  "admin",
  "api",
  "media",
  "sitemap.xml",
  "robots.txt",
  // Hand-built routes: a booking wizard, a filtered archive, a tracking
  // lookup. A CMS page at one of these slugs would save successfully and then
  // never render, because the file-system route always wins.
  "appointment",
  "arbitrator",
  "arbitrators",
  "articles",
  "consultation",
  "contact",
  "faq",
  "services",
  "tracking",
];

/* -------------------------------------------------------------------------- */
/*  Admin navigation                                                          */
/* -------------------------------------------------------------------------- */

export type AdminIconName =
  | "dashboard"
  | "calendar"
  | "inbox"
  | "users"
  | "gavel"
  | "briefcase"
  | "article"
  | "question"
  | "settings"
  | "mail"
  | "layers"
  | "image"
  | "link"
  | "palette"
  | "search"
  | "history"
  | "shield"
  | "quote"
  | "tag"
  | "code";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: AdminIconName;
  /** Hidden entirely from roles that lack this capability. */
  permission?: Permission;
  /** Highlights the parent entry for nested routes. */
  match?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

/**
 * The admin rail.
 *
 * Every entry declares the capability it needs, so a manager simply never
 * sees the content groups and an editor never sees settings — the navigation
 * and the server-side gate are driven by the same matrix.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: "نمای کلی",
    items: [{ label: "داشبورد", href: ROUTES.admin.root, icon: "dashboard" }],
  },
  {
    title: "محتوای سایت",
    items: [
      {
        label: "صفحات",
        href: ROUTES.admin.pages,
        icon: "layers",
        permission: "content",
      },
      {
        label: "مقالات",
        href: ROUTES.admin.articles,
        icon: "article",
        permission: "content",
      },
      {
        label: "دسته‌بندی‌ها",
        href: ROUTES.admin.categories,
        icon: "tag",
        permission: "content",
      },
      {
        label: "خدمات",
        href: ROUTES.admin.services,
        icon: "briefcase",
        permission: "content",
      },
      {
        label: "داوران و اعضا",
        href: ROUTES.admin.arbitrators,
        icon: "gavel",
        permission: "content",
      },
      {
        label: "نظرات",
        href: ROUTES.admin.testimonials,
        icon: "quote",
        permission: "content",
      },
      {
        label: "پرسش‌های متداول",
        href: ROUTES.admin.faq,
        icon: "question",
        permission: "content",
      },
      {
        label: "رسانه‌ها",
        href: ROUTES.admin.media,
        icon: "image",
        permission: "media",
      },
    ],
  },
  {
    title: "عملیات",
    items: [
      {
        label: "فرم‌ها",
        href: ROUTES.admin.forms,
        icon: "inbox",
        permission: "operations",
      },
      {
        label: "درخواست‌ها",
        href: ROUTES.admin.requests,
        icon: "mail",
        permission: "operations",
      },
      {
        label: "نوبت‌ها",
        href: ROUTES.admin.appointments,
        icon: "calendar",
        permission: "operations",
      },
    ],
  },
  {
    title: "ظاهر و پیکربندی",
    items: [
      {
        label: "منو و فوتر",
        href: ROUTES.admin.navigation,
        icon: "link",
        permission: "settings",
      },
      {
        label: "تنظیمات سایت",
        href: ROUTES.admin.settings,
        icon: "settings",
        permission: "settings",
        match: "/admin/settings",
      },
      {
        label: "سئو",
        href: ROUTES.admin.seo,
        icon: "search",
        permission: "settings",
      },
    ],
  },
  {
    title: "سیستم",
    items: [
      {
        label: "کاربران",
        href: ROUTES.admin.users,
        icon: "users",
        permission: "users",
      },
      {
        label: "گزارش فعالیت",
        href: ROUTES.admin.audit,
        icon: "history",
        permission: "audit",
      },
    ],
  },
];
