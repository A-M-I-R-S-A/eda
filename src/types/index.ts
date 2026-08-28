/**
 * Domain models for the institution's website.
 *
 * These interfaces are the single contract between the mock persistence layer
 * (`src/lib/db`) and everything above it. Swapping the JSON store for a real
 * database only requires re-implementing the repositories in `src/lib/db`,
 * not touching any UI or service code.
 *
 * The CMS-facing half of the model — pages, sections, media, navigation,
 * branding, revisions, the audit log — lives in `./cms` and is re-exported
 * here so every consumer keeps a single `@/types` import.
 */

export * from "./cms";

import type {
  AppointmentSettings,
  BrandingSettings,
  ContentStatus,
  CustomCodeSettings,
  FooterSettings,
  HeaderSettings,
  SeoFields,
  SeoSettings,
  SubmissionStatus,
} from "./cms";

/* -------------------------------------------------------------------------- */
/*  Shared                                                                    */
/* -------------------------------------------------------------------------- */

export type ID = string;

/** ISO-8601 timestamp string. All dates are stored as UTC ISO strings. */
export type ISODate = string;

export interface Timestamped {
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/*  Auth & users                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Administrative roles.
 *
 * `admin` is the super administrator; `editor` owns content and media;
 * `manager` owns operational data (forms, appointments) but never touches
 * configuration; `client` is a public visitor with no admin access at all.
 *
 * These are *not* ranked linearly — an editor may not read case operations and
 * a manager may not publish pages. `@/lib/auth/permissions` holds the matrix.
 */
export type UserRole = "admin" | "editor" | "manager" | "client";

export type UserStatus = "active" | "pending" | "suspended";

export interface User extends Timestamped {
  id: ID;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  /** scrypt hash — never leaves the server. */
  passwordHash?: string;
  lastLoginAt?: ISODate;
}

/** A `User` safe to serialise to the client. */
export type PublicUser = Omit<User, "passwordHash">;

export interface SessionPayload {
  sub: ID;
  email: string;
  role: UserRole;
  name: string;
}

/* -------------------------------------------------------------------------- */
/*  Services                                                                  */
/* -------------------------------------------------------------------------- */

export type ServiceCategory = "arbitration" | "advisory" | "dispute-resolution";

export interface Service extends Timestamped {
  id: ID;
  slug: string;
  title: string;
  shortDescription: string;
  /** Markdown-lite body rendered by `renderRichText`. */
  body: string;
  category: ServiceCategory;
  icon: ServiceIconName;
  highlights: string[];
  process: { title: string; description: string }[];
  faqIds: ID[];
  relatedSlugs: string[];
  /** Optional hero/card image chosen from the media library. */
  image?: string;
  /** Call-to-action rendered at the foot of the service page. */
  ctaLabel?: string;
  ctaHref?: string;
  order: number;
  status: ContentStatus;
  /** Go-live moment when `status` is `scheduled`. */
  scheduledFor?: ISODate;
  seo: SeoFields;
}

export type ServiceIconName =
  | "gavel-free-balance"
  | "handshake"
  | "globe"
  | "bridge"
  | "document"
  | "shield"
  | "briefcase"
  | "columns"
  | "compass"
  | "layers"
  | "scale-minimal";

/* -------------------------------------------------------------------------- */
/*  Arbitrators / legal team                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The institution's arbitrator.
 *
 * The organisation has a single arbitrator, so the public site renders one
 * profile rather than a directory. The model stays a collection purely so the
 * CMS can edit the record; `getPrincipalArbitrator()` is what pages use.
 *
 * Every biographical field is optional in practice: unset fields render as a
 * clearly-marked placeholder instead of invented content.
 */
export interface Arbitrator extends Timestamped {
  id: ID;
  slug: string;
  fullName: string;
  title: string;
  /** Optional portrait. When absent the UI renders an elegant monogram. */
  photoUrl?: string;
  /** معرفی — short introduction. */
  shortBio: string;
  /** معرفی — full introduction. */
  biography: string;
  /** تخصص‌ها */
  expertise: string[];
  /** حوزه‌های فعالیت */
  practiceAreas: string[];
  /** رویکرد حرفه‌ای */
  approach: string;
  languages: string[];
  /** `0` means "not supplied" — the UI hides it rather than showing zero. */
  yearsOfExperience: number;
  education: CredentialEntry[];
  /** سوابق حرفه‌ای */
  background: CredentialEntry[];
  memberships: string[];
  email?: string;
  order: number;
  /** Available for online appointment booking. */
  bookable: boolean;
  published: boolean;
  seo: SeoFields;
}

export interface CredentialEntry {
  title: string;
  institution: string;
  period: string;
}

/* -------------------------------------------------------------------------- */
/*  Articles / knowledge centre                                               */
/* -------------------------------------------------------------------------- */

/**
 * Article categories are CMS records, not a compile-time union.
 *
 * An administrator can add, rename and delete them from
 * `/admin/categories`, so the slug is only ever validated against the
 * categories that currently exist.
 */
export type ArticleCategorySlug = string;

export interface ArticleCategory {
  slug: ArticleCategorySlug;
  title: string;
  description: string;
}

export interface Article extends Timestamped {
  id: ID;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: ArticleCategorySlug;
  coverImage: string;
  authorId?: ID;
  authorName: string;
  publishedAt: ISODate;
  readingMinutes: number;
  tags: string[];
  featured: boolean;
  status: ContentStatus;
  /** Go-live moment when `status` is `scheduled`. */
  scheduledFor?: ISODate;
  seo: SeoFields;
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

/** FAQ groups are free-form so an administrator can introduce their own. */
export type FaqTopic = string;

export interface FaqItem extends Timestamped {
  id: ID;
  question: string;
  answer: string;
  topic: FaqTopic;
  order: number;
  published: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Consultation / arbitration requests                                       */
/* -------------------------------------------------------------------------- */

export type RequestType =
  | "consultation"
  | "arbitration"
  | "mediation"
  | "contract-review"
  | "representation";

export type ContactMethod = "phone" | "whatsapp" | "email" | "in-person";

export type CallWindow = "morning" | "afternoon" | "evening";

export type RequestStatus =
  | "submitted"
  | "in-review"
  | "approved"
  | "needs-info"
  | "scheduled"
  | "completed"
  | "cancelled";

export interface AttachmentMeta {
  id: ID;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: ISODate;
}

export interface InternalNote {
  id: ID;
  authorId: ID;
  authorName: string;
  body: string;
  createdAt: ISODate;
}

export interface StatusEvent {
  status: RequestStatus | AppointmentStatus;
  note?: string;
  at: ISODate;
  byName?: string;
}

export interface ConsultationRequest extends Timestamped {
  id: ID;
  /** Human-facing tracking code, e.g. `DR-4F92KH`. */
  trackingCode: string;
  fullName: string;
  phone: string;
  email?: string;
  requestType: RequestType;
  legalArea: string;
  subject: string;
  description: string;
  preferredContact: ContactMethod;
  preferredWindow: CallWindow;
  attachments: AttachmentMeta[];
  status: RequestStatus;
  timeline: StatusEvent[];
  notes: InternalNote[];
  assignedArbitratorId?: ID;
  consentAccepted: boolean;
  /** True when the submitter passed the one-time-code check on this number. */
  phoneVerified?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Consultation types are configured in the CMS
 * (`settings.appointments.types`), so the stored value is an open key rather
 * than a compile-time union.
 */
export type ConsultationType = string;

export type MeetingMode = "in-person" | "online" | "phone";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "rejected";

export interface ConsultationTypeOption {
  value: ConsultationType;
  title: string;
  description: string;
  durationMinutes: number;
  /** Persian, human-readable fee band — placeholder data. */
  feeLabel: string;
  modes: MeetingMode[];
}

export interface Appointment extends Timestamped {
  id: ID;
  /** Human-facing booking code, e.g. `RZ-8KD31M`. */
  bookingCode: string;
  fullName: string;
  phone: string;
  email?: string;
  nationalIdLast4?: string;
  consultationType: ConsultationType;
  /**
   * The meeting type's name at the moment of booking.
   *
   * Types are CMS records that can be renamed or removed, so the label is
   * frozen onto the appointment. A booking made under «مشاوره اولیه» keeps
   * saying that, which is what both the client's receipt and the case history
   * require.
   */
  consultationTypeLabel: string;
  arbitratorId: ID;
  arbitratorName: string;
  /** Gregorian ISO date, `YYYY-MM-DD`. */
  date: string;
  /** 24h `HH:mm`. */
  time: string;
  durationMinutes: number;
  meetingMode: MeetingMode;
  subject: string;
  status: AppointmentStatus;
  timeline: StatusEvent[];
  notes: InternalNote[];
  consentAccepted: boolean;
  /** True when the booker passed the one-time-code check on this number. */
  phoneVerified?: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Contact messages                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Contact messages share the site-wide submission vocabulary so the unified
 * "forms" inbox can present every channel with one status filter.
 */
export type ContactMessageStatus = SubmissionStatus;

export interface ContactMessage extends Timestamped {
  id: ID;
  fullName: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  /** Staff-only notes; never surfaced to the sender. */
  notes: InternalNote[];
}

/* -------------------------------------------------------------------------- */
/*  SMS                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Why a message was sent.
 *
 * `otp` never stores its body — see `SmsLogEntry.body`.
 */
export type SmsPurpose =
  | "otp"
  | "status-update"
  | "admin-alert";

export type SmsDeliveryStatus = "sent" | "failed";

/**
 * A record of every SMS the system attempted.
 *
 * Messages cost money and carry case information, so each send is auditable:
 * who triggered it, which record it referred to, what the provider answered.
 */
export interface SmsLogEntry {
  id: ID;
  /** Recipient in `09xxxxxxxxx` form. */
  to: string;
  purpose: SmsPurpose;
  /**
   * The delivered text. One-time codes are stored as a fixed placeholder
   * instead: an audit trail must never become a list of live credentials.
   */
  body: string;
  status: SmsDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  /** Provider or transport error, when `status` is `failed`. */
  error?: string;
  /** The record the message was about, for messages that concern one. */
  entityType?: "request" | "appointment";
  entityId?: ID;
  /** The staff member who pressed send; absent for automatic messages. */
  sentById?: ID;
  sentByName?: string;
  createdAt: ISODate;
}

/** A person who is alerted when new work arrives. */
export interface SmsStaffRecipient {
  /** Passed to the template as its name parameter. */
  name: string;
  /** `09xxxxxxxxx`. */
  phone: string;
}

/**
 * SMS behaviour, configured from the admin panel.
 *
 * ── Templates, not free text ──────────────────────────────────────────────
 * sms.ir sends transactional messages through templates registered and
 * approved in its own panel; the API supplies only parameter *values*. The
 * wording therefore lives at the provider, and what is configured here is
 * which template to use and what its parameters are called.
 *
 * That is also why there is no message-body field anywhere in this app: a box
 * for composing text would imply an ability the account does not have, and
 * every send would be rejected.
 *
 * Provider credentials stay in the environment — an editor with access to the
 * settings screen must not be able to read the account's API key. Template ids
 * are not secret and live here, so they can be changed without a deploy.
 */
export interface SmsSettings {
  /** Master switch. Nothing is sent while this is false. */
  enabled: boolean;
  /** Require a verified phone number before a public form can be submitted. */
  requirePhoneVerification: boolean;

  /* -- staff alert: new submission ---------------------------------------- */

  /** People alerted when an enquiry or booking arrives. */
  staffRecipients: SmsStaffRecipient[];
  notifyStaffOnRequest: boolean;
  notifyStaffOnAppointment: boolean;
  /** Registered template id for the staff alert. Empty disables it. */
  staffTemplateId: string;
  /** Parameter in that template carrying the staff member's name. */
  staffNameParam: string;
  /** Parameter in that template carrying the tracking or booking code. */
  staffCodeParam: string;

  /* -- client notification: status update --------------------------------- */

  /** Registered template id for the update sent to a client. Empty disables it. */
  updateTemplateId: string;
  /** Parameter in that template carrying the tracking or booking code. */
  updateCodeParam: string;
}

/* -------------------------------------------------------------------------- */
/*  Site settings                                                             */
/* -------------------------------------------------------------------------- */

export interface WorkingHour {
  label: string;
  value: string;
}

export type SocialPlatform =
  | "linkedin"
  | "instagram"
  | "telegram"
  | "x"
  | "whatsapp"
  | "aparat"
  | "youtube"
  | "facebook"
  | "website";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  url: string;
}

export interface SiteSettings extends Timestamped {
  id: "site";
  institutionName: string;
  institutionShortName: string;
  tagline: string;
  description: string;
  /** Media URL for the site logo. Empty falls back to the drawn monogram. */
  logoUrl?: string;
  /** Media URL for the favicon. Empty keeps the bundled icon. */
  faviconUrl?: string;
  /** BCP-47 tag written to `<html lang>`. */
  language: string;
  /** `rtl` or `ltr`, written to `<html dir>`. */
  direction: "rtl" | "ltr";
  phones: string[];
  /** Mobile line, shown separately from the landline numbers. */
  mobile: string;
  email: string;
  address: string;
  postalCode: string;
  mapEmbedUrl: string;
  mapLat: number;
  mapLng: number;
  workingHours: WorkingHour[];
  socials: SocialLink[];
  registrationNumber: string;

  /**
   * Configuration groups.
   *
   * Each one is edited by its own admin screen and is optional on read so a
   * snapshot written before the group existed still loads; the repository
   * layer fills the gap with the shipped default.
   */
  header: HeaderSettings;
  footer: FooterSettings;
  branding: BrandingSettings;
  seo: SeoSettings;
  customCode: CustomCodeSettings;
  appointments: AppointmentSettings;
  sms: SmsSettings;
  /**
   * A legally distinct notary office (دفتر اسناد رسمی) that belongs to a
   * *different* person and is **not** part of the arbitration institution.
   *
   * Disabled and empty by default: nothing about it is rendered until real,
   * supplied information is entered. It is modelled separately — never merged
   * into the institution's own contact details — so the two entities can never
   * be presented as one organisation.
   */
  notaryOffice?: NotaryOffice;
}

export interface NotaryOffice {
  /** Nothing renders anywhere on the site while this is false. */
  enabled: boolean;
  /** Office name, e.g. «دفتر اسناد رسمی شماره …». Supplied, never inferred. */
  officeName: string;
  /** The notary's name. This person is NOT the arbitrator. */
  notaryName: string;
  phone: string;
  address: string;
  note: string;
}

/* -------------------------------------------------------------------------- */
/*  Generic result envelope used by every server action                       */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
