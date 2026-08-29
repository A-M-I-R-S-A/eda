import "server-only";

import { buildSeedDatabase } from "@/data";
import {
  DEFAULT_APPOINTMENTS,
  DEFAULT_BRANDING,
  DEFAULT_CUSTOM_CODE,
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_SEO,
  DEFAULT_SMS,
} from "@/data/defaults";
import { SEED_CATEGORIES, SEED_MEDIA } from "@/data/cms-seed";
import { SEED_PAGES } from "@/data/pages";
import type { ContentStatus, SubmissionStatus } from "@/types";
import { COLLECTION_KEYS, DB_VERSION, type Database } from "./schema";

/**
 * Forward-migration of a persisted snapshot.
 *
 * Discarding an administrator's content because a field was added is not an
 * acceptable upgrade path, so the store migrates in place and only falls back
 * to a fresh seed when the snapshot is unreadable. Every step is idempotent:
 * running the migration twice produces the same database.
 */

type Loose = Record<string, unknown>;

const isObject = (value: unknown): value is Loose =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Fills in keys the stored object is missing, without overwriting real values. */
function withDefaults<T extends object>(stored: unknown, defaults: T): T {
  if (!isObject(stored)) return structuredClone(defaults);

  const result = structuredClone(defaults) as Loose;
  for (const [key, value] of Object.entries(stored)) {
    if (value !== undefined && value !== null) result[key] = value;
  }
  return result as T;
}

/* -------------------------------------------------------------------------- */
/*  v1 → v2                                                                   */
/* -------------------------------------------------------------------------- */

/** `published: boolean` became the four-state `status` field. */
function migrateStatus(record: Loose): ContentStatus {
  if (typeof record.status === "string") {
    const status = record.status;
    if (["draft", "published", "scheduled", "archived"].includes(status)) {
      return status as ContentStatus;
    }
  }
  return record.published === false ? "draft" : "published";
}

/** Contact messages moved onto the shared submission vocabulary. */
const MESSAGE_STATUS_MAP: Record<string, SubmissionStatus> = {
  new: "new",
  read: "in-progress",
  answered: "completed",
  archived: "archived",
};

function migrateToV2(db: Loose): void {
  /* -- settings groups --------------------------------------------------- */
  const settings = isObject(db.settings) ? db.settings : {};

  settings.header = withDefaults(settings.header, DEFAULT_HEADER);
  settings.footer = withDefaults(settings.footer, DEFAULT_FOOTER);
  settings.branding = withDefaults(settings.branding, DEFAULT_BRANDING);
  settings.customCode = withDefaults(settings.customCode, DEFAULT_CUSTOM_CODE);
  settings.appointments = withDefaults(settings.appointments, DEFAULT_APPOINTMENTS);

  // `seo` did not exist on the v1 settings record, so there is nothing to
  // preserve — but guard anyway in case a partial write left something there.
  settings.seo = withDefaults(settings.seo, DEFAULT_SEO);

  settings.language ??= "fa-IR";
  settings.direction ??= "rtl";
  settings.logoUrl ??= "";
  settings.faviconUrl ??= "";
  settings.mobile ??=
    asArray<string>(settings.phones).find((phone) => phone.startsWith("09")) ?? "";

  db.settings = settings;

  /* -- new collections --------------------------------------------------- */
  if (!Array.isArray(db.pages) || db.pages.length === 0) {
    db.pages = structuredClone(SEED_PAGES);
  }
  if (!Array.isArray(db.categories) || db.categories.length === 0) {
    db.categories = structuredClone(SEED_CATEGORIES);
  }
  if (!Array.isArray(db.media) || db.media.length === 0) {
    db.media = structuredClone(SEED_MEDIA);
  }

  /* -- publication workflow ---------------------------------------------- */
  for (const record of asArray<Loose>(db.articles)) {
    record.status = migrateStatus(record);
    delete record.published;
  }

  /* -- unified submission statuses --------------------------------------- */
  for (const record of asArray<Loose>(db.messages)) {
    const current = typeof record.status === "string" ? record.status : "new";
    record.status = MESSAGE_STATUS_MAP[current] ?? current;
    if (!Array.isArray(record.notes)) record.notes = [];
  }
}

/* -------------------------------------------------------------------------- */
/*  v2 → v3                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * SMS arrived as a settings group and a log collection.
 *
 * Backfilled disabled: an existing installation must not start sending
 * messages because it was upgraded.
 */
function migrateToV3(db: Loose): void {
  const settings = isObject(db.settings) ? db.settings : {};
  settings.sms = withDefaults(settings.sms, DEFAULT_SMS);
  db.settings = settings;
}

/* -------------------------------------------------------------------------- */
/*  v3 → v4                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * SMS moved from free-text bodies to sms.ir templates.
 *
 * The provider sends transactional messages by naming a registered template
 * and supplying parameter values; free text is a separate product this account
 * does not have. The old settings therefore described something that could
 * never be sent, and are replaced rather than migrated: template ids cannot be
 * inferred from message wording, so an administrator has to supply them.
 *
 * Recipients are the one thing worth carrying across — they are phone numbers
 * somebody typed, and the new shape only adds a name beside each.
 */
function migrateToV4(db: Loose): void {
  const settings = isObject(db.settings) ? db.settings : {};
  const previous = isObject(settings.sms) ? settings.sms : {};

  const carried = asArray<string>(previous.adminRecipients)
    .filter((phone) => typeof phone === "string" && phone)
    .map((phone) => ({ name: "", phone }));

  settings.sms = {
    ...structuredClone(DEFAULT_SMS),
    enabled: previous.enabled === true,
    requirePhoneVerification: previous.requirePhoneVerification !== false,
    notifyStaffOnAppointment: previous.notifyAdminOnAppointment !== false,
    staffRecipients: carried,
  };

  db.settings = settings;
}

/* -------------------------------------------------------------------------- */
/*  v4 → v5                                                                   */
/* -------------------------------------------------------------------------- */

/** Public paths the removed modules used to own. */
const isRemovedPath = (value: unknown): boolean =>
  typeof value === "string" &&
  (value === "/services" ||
    value.startsWith("/services/") ||
    value === "/consultation");

const isServicesPath = (value: unknown): boolean =>
  typeof value === "string" &&
  (value === "/services" || value.startsWith("/services/"));

/**
 * Drops navigation entries that point at a route which no longer exists.
 *
 * Editing in place rather than rebuilding from the defaults: every other link
 * in these lists was typed by an administrator, and re-seeding to remove one
 * entry would discard the rest.
 */
function pruneLinks(value: unknown): Loose[] {
  return asArray<Loose>(value).filter((link) => !isRemovedPath(link?.href));
}

/**
 * Button and link fields inside a section's authored data.
 *
 * A URL is paired with its own label, so clearing one without the other leaves
 * a button with text and nowhere to go.
 */
const LINK_PAIRS: [url: string, label: string][] = [
  ["linkUrl", "linkText"],
  ["primaryButtonUrl", "primaryButtonLabel"],
  ["secondaryButtonUrl", "secondaryButtonLabel"],
  ["ctaHref", "ctaLabel"],
];

/**
 * Repoints or clears the links an administrator wrote into a section.
 *
 * `/consultation` still resolves — it redirects to the contact page — but a
 * site that links to its own redirect is one deploy away from a dead link, so
 * the target is rewritten here. `/services` has no successor, so the button is
 * removed outright rather than left pointing at a 404.
 */
function repointSectionData(data: unknown): void {
  if (!isObject(data)) return;

  for (const [urlKey, labelKey] of LINK_PAIRS) {
    const url = data[urlKey];
    if (isServicesPath(url)) {
      data[urlKey] = "";
      data[labelKey] = "";
    } else if (url === "/consultation") {
      data[urlKey] = "/contact";
    }
  }

  // Repeaters (cards, features, gallery items) hold the same link fields.
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) value.forEach(repointSectionData);
  }
}

/**
 * The services module and the consultation form were removed.
 *
 * Everything here is a deletion of something that can no longer render, and
 * nothing else is touched — an administrator's pages, articles, FAQ entries,
 * settings and submissions all carry across unchanged. The `services` SQL
 * table is deliberately left in place rather than dropped: it is no longer
 * read, but the rows remain recoverable.
 */
/**
 * The one seeded FAQ answer that walked a visitor through the withdrawn form.
 *
 * Its instructions — fill in the request form, attach the arbitration
 * agreement, collect a tracking code — describe a page that no longer exists,
 * so leaving it would be actively misleading rather than merely stale.
 *
 * Rewritten **only when it is still word-for-word as shipped**. An
 * administrator who reworded it keeps their wording: losing somebody's writing
 * to fix a link is the worse outcome, and a mismatch is logged instead so it
 * can be corrected in the panel. Exactly one version of this text was ever
 * shipped, which is what makes a single equality check reliable.
 */
const RETIRED_FAQ_ID = "faq-how-to-file";

const RETIRED_FAQ_ANSWER =
  "کافی است فرم «درخواست مشاوره» را در همین وب‌سایت تکمیل کرده و نوع درخواست را «درخواست داوری» انتخاب کنید. شرح مختصری از موضوع اختلاف بنویسید و در بخش فایل پیوست، قرارداد حاوی شرط داوری یا موافقت‌نامه داوری و مستندات کلیدی را بارگذاری نمایید. پس از ثبت، یک کد پیگیری دریافت می‌کنید که با آن می‌توانید در هر زمان وضعیت پرونده را در صفحه «پیگیری درخواست» مشاهده کنید. کارشناسان مؤسسه پس از بررسی مقدماتی صلاحیت، مراحل بعدی را به شما اعلام می‌کنند.";

const REPLACEMENT_FAQ_ANSWER =
  "از صفحه «تماس با ما» موضوع اختلاف را به‌اختصار شرح دهید، یا از بخش «رزرو وقت» یک جلسه تعیین کنید. قرارداد حاوی شرط داوری یا موافقت‌نامه داوری و مستندات کلیدی را در همان جلسه ارائه کنید — این اسناد را از طریق فرم عمومی ارسال نکنید. کارشناسان مؤسسه پس از بررسی مقدماتی صلاحیت، مراحل بعدی و کد پیگیری پرونده را به شما اعلام می‌کنند.";

function repointRetiredFaq(db: Loose): void {
  for (const faq of asArray<Loose>(db.faqs)) {
    if (faq.id !== RETIRED_FAQ_ID) continue;

    if (faq.answer === RETIRED_FAQ_ANSWER) {
      faq.answer = REPLACEMENT_FAQ_ANSWER;
      faq.updatedAt = new Date().toISOString();
    } else if (
      typeof faq.answer === "string" &&
      faq.answer.includes("درخواست مشاوره")
    ) {
      console.warn(
        `[db] FAQ ${RETIRED_FAQ_ID} still mentions the withdrawn request form, ` +
          "but has been edited since it was seeded — left untouched. Update it at /admin/faq.",
      );
    }
    return;
  }
}

function migrateToV5(db: Loose): void {
  /* -- the collection itself --------------------------------------------- */
  delete db.services;

  /* -- pages -------------------------------------------------------------- */
  const removedSlugs = new Set(["services", "consultation"]);

  db.pages = asArray<Loose>(db.pages)
    .filter((page) => !removedSlugs.has(String(page.slug ?? "")))
    .map((page) => {
      const sections = asArray<Loose>(page.sections).filter(
        (section) => section.type !== "services",
      );
      for (const section of sections) repointSectionData(section.data);
      return { ...page, sections };
    });

  /* -- content that described the withdrawn form --------------------------- */
  repointRetiredFaq(db);

  /* -- revisions of a deleted entity -------------------------------------- */
  db.revisions = asArray<Loose>(db.revisions).filter(
    (revision) => revision.entity !== "service",
  );

  /* -- navigation --------------------------------------------------------- */
  const settings = isObject(db.settings) ? db.settings : {};

  const header = isObject(settings.header) ? settings.header : null;
  if (header) {
    header.nav = pruneLinks(header.nav);
    header.utilityLinks = pruneLinks(header.utilityLinks);
    header.mobileQuickLinks = pruneLinks(header.mobileQuickLinks);
    if (isRemovedPath(header.ctaHref)) {
      header.ctaHref = "/appointment";
    }
    if (isRemovedPath(header.mobileCtaHref)) {
      header.mobileCtaHref = "/appointment";
    }
  }

  const footer = isObject(settings.footer) ? settings.footer : null;
  if (footer) {
    footer.columns = asArray<Loose>(footer.columns).map((column) => ({
      ...column,
      links: pruneLinks(column.links),
    }));
    footer.quickActions = pruneLinks(footer.quickActions);
    footer.legalLinks = pruneLinks(footer.legalLinks);
    delete footer.showServiceLinks;
  }

  /* -- sms ---------------------------------------------------------------- */
  // Credentials became editable from the panel; the new keys start empty so
  // an installation configured through the environment keeps working.
  settings.sms = withDefaults(settings.sms, DEFAULT_SMS);
  if (isObject(settings.sms)) delete settings.sms.notifyStaffOnRequest;

  db.settings = settings;
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Brings a snapshot of any known version up to `DB_VERSION`.
 *
 * Returns `null` when the snapshot is too damaged to salvage, which tells the
 * store to re-seed rather than serve a half-formed database.
 */
export async function migrate(stored: unknown): Promise<Database | null> {
  if (!isObject(stored)) return null;

  const version = typeof stored.version === "number" ? stored.version : 0;
  if (version > DB_VERSION) {
    // A snapshot from a newer build. Refuse rather than silently downgrade.
    console.warn(
      `[db] snapshot version ${version} is newer than ${DB_VERSION}; re-seeding.`,
    );
    return null;
  }

  const db = structuredClone(stored) as Loose;

  if (version < 2) migrateToV2(db);
  if (version < 3) migrateToV3(db);
  if (version < 4) migrateToV4(db);
  if (version < 5) migrateToV5(db);

  db.version = DB_VERSION;

  // Backfill any collection the snapshot lacks so repositories never touch
  // `undefined.push`.
  for (const key of COLLECTION_KEYS) {
    if (!Array.isArray(db[key])) db[key] = [];
  }

  // A database with no users cannot be signed into and cannot be repaired from
  // the UI; a fresh seed is the only useful outcome.
  if (asArray<Loose>(db.users).length === 0) {
    console.warn("[db] snapshot has no users; re-seeding.");
    return null;
  }

  // Settings are non-optional for every page render.
  if (!isObject(db.settings)) {
    const seeded = await buildSeedDatabase();
    db.settings = seeded.settings;
  }

  return db as unknown as Database;
}
