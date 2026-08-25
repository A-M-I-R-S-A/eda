import type {
  Appointment,
  Arbitrator,
  Article,
  AuditLogEntry,
  Category,
  ConsultationRequest,
  ContactMessage,
  FaqItem,
  MediaAsset,
  NewsletterSubscriber,
  Page,
  Revision,
  Service,
  SiteSettings,
  SmsLogEntry,
  Testimonial,
  User,
} from "@/types";

/**
 * Bump when the persisted shape changes.
 *
 * `store.ts` runs `migrate()` first and only falls back to a fresh seed when
 * the snapshot cannot be brought forward — an administrator's content is not
 * something to discard over a schema change.
 */
export const DB_VERSION = 3;

/**
 * The complete persisted state.
 *
 * This is the *only* shape the storage adapter knows about. Replacing the JSON
 * adapter with Postgres/Prisma means implementing the repositories in
 * `src/lib/db/index.ts` against real tables — no consumer code changes.
 */
export interface Database {
  version: number;
  settings: SiteSettings;
  users: User[];

  /* -- CMS content ------------------------------------------------------- */
  pages: Page[];
  media: MediaAsset[];
  services: Service[];
  arbitrators: Arbitrator[];
  articles: Article[];
  categories: Category[];
  testimonials: Testimonial[];
  faqs: FaqItem[];

  /* -- Inbound ----------------------------------------------------------- */
  requests: ConsultationRequest[];
  appointments: Appointment[];
  messages: ContactMessage[];
  newsletter: NewsletterSubscriber[];

  /* -- System ------------------------------------------------------------ */
  revisions: Revision[];
  auditLog: AuditLogEntry[];
  /** Every SMS the system attempted, successful or not. */
  smsLog: SmsLogEntry[];
}

export type CollectionKey = Exclude<keyof Database, "version" | "settings">;

/** Every array-valued collection, used by the migration to backfill gaps. */
export const COLLECTION_KEYS: CollectionKey[] = [
  "users",
  "pages",
  "media",
  "services",
  "arbitrators",
  "articles",
  "categories",
  "testimonials",
  "faqs",
  "requests",
  "appointments",
  "messages",
  "newsletter",
  "revisions",
  "auditLog",
  "smsLog",
];

/**
 * Caps on append-only collections.
 *
 * The audit log and revision history grow without bound otherwise, and this
 * store keeps everything in memory. Trimming oldest-first keeps a useful
 * window without letting a long-lived deployment balloon.
 */
export const MAX_AUDIT_ENTRIES = 2000;
export const MAX_REVISIONS_PER_ENTITY = 20;
export const MAX_SMS_LOG_ENTRIES = 2000;
