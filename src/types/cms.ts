/**
 * CMS domain models.
 *
 * Everything the public website renders — pages, the sections inside them,
 * navigation, branding, media and SEO — is described here so an administrator
 * can change it without a deploy. The rule the whole codebase follows: if a
 * visitor can read it, it lives in one of these records, not in a component.
 *
 * These types are additive to `@/types`, which re-exports them so call sites
 * keep a single import.
 */

import type { ID, ISODate, Timestamped, UserRole } from "./index";

/* -------------------------------------------------------------------------- */
/*  Publication workflow                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The lifecycle every piece of long-form content shares.
 *
 * `scheduled` is not a synonym for "published later": a scheduled record is
 * invisible until `scheduledFor` passes, at which point the read layer treats
 * it as published. Nothing runs a cron job — visibility is computed on read,
 * which keeps the behaviour correct on a serverless host.
 */
export type ContentStatus = "draft" | "published" | "scheduled" | "archived";

export interface Publishable {
  status: ContentStatus;
  /** When the record first went live. */
  publishedAt?: ISODate;
  /** Go-live moment for `status: "scheduled"`. */
  scheduledFor?: ISODate;
}

/* -------------------------------------------------------------------------- */
/*  Media library                                                             */
/* -------------------------------------------------------------------------- */

export type MediaKind = "image" | "document" | "video" | "other";

export interface MediaAsset extends Timestamped {
  id: ID;
  /** Unguessable name on disk. Never client-supplied. */
  fileName: string;
  /** Administrator-editable display name. */
  title: string;
  /** Alternative text. Empty means decorative. */
  alt: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  /** Intrinsic pixel dimensions — images only. */
  width?: number;
  height?: number;
  /** Public URL served by the media route handler. */
  url: string;
  uploadedById?: ID;
  uploadedByName?: string;
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The section library.
 *
 * Adding a type means one entry in `SECTION_LIBRARY` (field schema plus
 * defaults) and one renderer in `@/components/sections`. Nothing else in the
 * admin has to change — the editor builds itself from the field schema.
 */
export type SectionType =
  | "hero"
  | "text-image"
  | "rich-text"
  | "cards"
  | "features"
  | "stats"
  | "testimonials"
  | "faq"
  | "gallery"
  | "team"
  | "timeline"
  | "cta"
  | "articles"
  | "contact"
  | "map"
  | "custom-html";

export type SectionBackground = "paper" | "muted" | "white" | "navy";

export type SectionSpacing = "none" | "sm" | "md" | "lg";

export type SectionAlignment = "start" | "center";

/**
 * A section's field values.
 *
 * Deliberately loose: the section definition is the schema, and the accessors
 * in `@/lib/cms/section-data` are what give renderers typed reads. That is
 * what lets one generic editor drive every section type.
 */
export type SectionValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SectionData[];

export interface SectionData {
  [key: string]: SectionValue;
}

export interface PageSection {
  id: ID;
  type: SectionType;
  /** Administrator-facing name shown in the section list. */
  name: string;
  visible: boolean;
  order: number;
  background: SectionBackground;
  spacing: SectionSpacing;
  data: SectionData;
}

/* -------------------------------------------------------------------------- */
/*  Field schema driving the generic section editor                           */
/* -------------------------------------------------------------------------- */

export type FieldKind =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "toggle"
  | "select"
  | "image"
  | "video"
  | "url"
  | "icon"
  | "color"
  | "repeater";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  placeholder?: string;
  options?: FieldOption[];
  /** Repeater only: the shape of one row. */
  fields?: FieldDef[];
  /** Repeater only: which row field labels the collapsed row. */
  titleField?: string;
  /** Upper bound: rows for a repeater, value for a number. */
  max?: number;
  /** Number only. */
  min?: number;
  step?: number;
  /** Renders the field at half width on wide screens. */
  half?: boolean;
  rows?: number;
}

export interface SectionDefinition {
  type: SectionType;
  label: string;
  description: string;
  /** Grouping in the "add section" picker. */
  group: "layout" | "content" | "collections" | "conversion" | "advanced";
  fields: FieldDef[];
  defaults: SectionData;
  defaultBackground?: SectionBackground;
  defaultSpacing?: SectionSpacing;
}

/* -------------------------------------------------------------------------- */
/*  SEO                                                                       */
/* -------------------------------------------------------------------------- */

export interface SeoFields {
  metaTitle: string;
  metaDescription: string;
  /** Absolute or root-relative override; defaults to the entity's own path. */
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export interface SeoSettings {
  defaultTitle: string;
  /** `%s` is replaced by the page title. */
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage?: string;
  keywords: string[];
  /** Site-wide switches. A single page can still opt out of indexing. */
  indexSite: boolean;
  followLinks: boolean;
  sitemapEnabled: boolean;
  /** Extra robots.txt directives, one per line. */
  robotsExtra: string;
  twitterHandle?: string;
}

/* -------------------------------------------------------------------------- */
/*  Pages                                                                     */
/* -------------------------------------------------------------------------- */

export interface Page extends Timestamped, Publishable {
  id: ID;
  /** Path segment. The home page uses the reserved empty slug. */
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  sections: PageSection[];
  seo: SeoFields;
  /** Offered as a target when editing navigation. */
  showInNav: boolean;
  order: number;
  /**
   * A system page is backed by a hand-built route (`/contact`, `/articles`…)
   * whose behaviour cannot be expressed as sections alone. Its content is
   * still fully editable; only deletion and slug changes are locked.
   */
  system: boolean;
  /** Set on system pages so the editor can explain what the route does. */
  systemNote?: string;
}

/* -------------------------------------------------------------------------- */
/*  Navigation, header and footer                                             */
/* -------------------------------------------------------------------------- */

export interface NavLink {
  id: ID;
  label: string;
  href: string;
  description?: string;
  order: number;
  visible: boolean;
  /** Opens in a new tab with `rel="noopener"`. */
  external?: boolean;
  /** One level of dropdown. Deeper nesting is intentionally unsupported. */
  children?: NavLink[];
}

export type HeaderStyle = "classic" | "minimal" | "bordered";

export interface HeaderSettings {
  /** Media URL. When empty the monogram mark is drawn instead. */
  logoUrl?: string;
  /** Rendered logo height in pixels. */
  logoHeight: number;
  showWordmark: boolean;
  descriptor: string;
  nav: NavLink[];
  ctaVisible: boolean;
  ctaLabel: string;
  ctaHref: string;
  style: HeaderStyle;
  sticky: boolean;
  showUtilityBar: boolean;
  utilityLinks: NavLink[];
  showPhone: boolean;
  showHours: boolean;
  mobileMenuEnabled: boolean;
  mobileCtaLabel: string;
  mobileCtaHref: string;
  /** Quick-access cards inside the mobile drawer. */
  mobileQuickLinks: NavLink[];
}

export interface FooterColumn {
  id: ID;
  title: string;
  order: number;
  visible: boolean;
  links: NavLink[];
}

export interface FooterSettings {
  logoUrl?: string;
  showWordmark: boolean;
  description: string;
  columns: FooterColumn[];
  /** The three-up action band above the legal strip. */
  quickActions: NavLink[];
  legalLinks: NavLink[];
  /** Supports the `{year}` and `{name}` placeholders. */
  copyright: string;
  showContactBlock: boolean;
  showSocials: boolean;
  showAdminLink: boolean;
  /** Newsletter sign-up block. */
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterDescription: string;
}

/* -------------------------------------------------------------------------- */
/*  Branding                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Runtime theme.
 *
 * Emitted as CSS custom properties on the document root, overriding the
 * compile-time Tailwind tokens. Anything left at its default value is simply
 * not emitted, so the designed palette stays authoritative until an
 * administrator deliberately departs from it.
 */
export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  /** CSS font stack. Empty keeps the bundled Vazirmatn. */
  fontFamily: string;
  baseFontSize: number;
  headingScale: number;
  lineHeight: number;
  cornerRadius: number;
}

/* -------------------------------------------------------------------------- */
/*  Advanced / custom code                                                    */
/* -------------------------------------------------------------------------- */

export interface CustomCodeSettings {
  customCss: string;
  customJs: string;
  /** Raw markup; script tags are extracted and rendered as real scripts. */
  headScripts: string;
  bodyScripts: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  enamadHtml: string;
}

/* -------------------------------------------------------------------------- */
/*  Appointment configuration                                                 */
/* -------------------------------------------------------------------------- */

export interface AppointmentTypeConfig {
  id: ID;
  /** Stable key stored on booked appointments. */
  value: string;
  title: string;
  description: string;
  durationMinutes: number;
  feeLabel: string;
  modes: ("in-person" | "online" | "phone")[];
  enabled: boolean;
  order: number;
}

export interface WorkingDayConfig {
  /** Iranian week: 0 = شنبه … 6 = جمعه. */
  day: number;
  enabled: boolean;
  /** `HH:mm`. */
  start: string;
  end: string;
}

export interface AppointmentSettings {
  /** Turns the public booking flow on or off site-wide. */
  enabled: boolean;
  slotMinutes: number;
  /** Gap inserted after every meeting. */
  bufferMinutes: number;
  maxPerDay: number;
  /** Earliest bookable day, counted from today. */
  leadTimeDays: number;
  /** Furthest bookable day, counted from today. */
  horizonDays: number;
  days: WorkingDayConfig[];
  /** Explicit closures — holidays, leave. `YYYY-MM-DD`. */
  blockedDates: string[];
  types: AppointmentTypeConfig[];
  /** New bookings land as pending rather than confirmed. */
  requireApproval: boolean;
  note: string;
}

/* -------------------------------------------------------------------------- */
/*  Taxonomy and social proof                                                 */
/* -------------------------------------------------------------------------- */

export interface Category extends Timestamped {
  id: ID;
  slug: string;
  title: string;
  description: string;
  imageUrl?: string;
  order: number;
  published: boolean;
}

export interface Testimonial extends Timestamped {
  id: ID;
  authorName: string;
  authorTitle: string;
  photoUrl?: string;
  quote: string;
  /** 0 hides the star row entirely. */
  rating: number;
  order: number;
  published: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Form submissions                                                          */
/* -------------------------------------------------------------------------- */

/** The shared vocabulary for everything that arrives from a public form. */
export type SubmissionStatus =
  | "new"
  | "in-progress"
  | "completed"
  | "rejected"
  | "archived";

export type NewsletterStatus = "new" | "confirmed" | "unsubscribed";

export interface NewsletterSubscriber extends Timestamped {
  id: ID;
  email: string;
  name?: string;
  status: NewsletterStatus;
  /** Which page or widget captured the address. */
  source: string;
}

/* -------------------------------------------------------------------------- */
/*  Audit log                                                                 */
/* -------------------------------------------------------------------------- */

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "reorder"
  | "restore"
  | "upload"
  | "status"
  | "login"
  | "logout"
  /** A sign-in that was refused — recorded even though the UI stays vague. */
  | "login-failed"
  /** A message sent to a client about their case. */
  | "sms";

export type AuditEntity =
  | "page"
  | "section"
  | "article"
  /**
   * Historical only. The services module was removed; entries written while
   * it existed stay in the log, so the value has to keep resolving to a label.
   */
  | "service"
  | "arbitrator"
  | "faq"
  | "category"
  | "testimonial"
  | "media"
  | "user"
  | "settings"
  | "header"
  | "footer"
  | "branding"
  | "seo"
  | "appointment"
  | "request"
  | "message"
  | "newsletter"
  | "session"
  | "sms";

export interface AuditLogEntry {
  id: ID;
  at: ISODate;
  actorId: ID;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: ID;
  /** Human-readable name of the thing acted on, frozen at write time. */
  entityLabel: string;
  detail?: string;
  ip?: string;
}

/* -------------------------------------------------------------------------- */
/*  Revisions                                                                 */
/* -------------------------------------------------------------------------- */

export type RevisionEntity = "page" | "article" | "settings";

export interface Revision {
  id: ID;
  entity: RevisionEntity;
  entityId: ID;
  /** Title at the time of the snapshot, so the list reads without a join. */
  label: string;
  at: ISODate;
  authorId: ID;
  authorName: string;
  note?: string;
  /** Complete entity snapshot. Restoring writes this back verbatim. */
  snapshot: unknown;
}
