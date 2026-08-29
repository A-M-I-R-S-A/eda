import "server-only";

import type {
  AppointmentSettings,
  AuditAction,
  AuditEntity,
  AuditLogEntry,
  BrandingSettings,
  Category,
  CustomCodeSettings,
  FooterSettings,
  HeaderSettings,
  ID,
  MediaAsset,
  MediaKind,
  NewsletterStatus,
  NewsletterSubscriber,
  Page,
  PageSection,
  Revision,
  RevisionEntity,
  SeoSettings,
  SmsDeliveryStatus,
  SmsLogEntry,
  SmsPurpose,
  SmsSettings,
  Testimonial,
  UserRole,
} from "@/types";
import { newId } from "@/lib/utils/id";
import { normalizeFa } from "@/lib/utils/persian";
import { isLive } from "@/lib/cms/status";
import {
  MAX_AUDIT_ENTRIES,
  MAX_REVISIONS_PER_ENTITY,
  MAX_SMS_LOG_ENTRIES,
} from "./schema";
import { mutate, readDb } from "./store";

/**
 * CMS repositories.
 *
 * Same contract as the rest of `@/lib/db`: everything returned is a deep
 * clone, and every write goes through `mutate()`. Swapping the JSON store for
 * a real database means re-implementing these functions, nothing else.
 */

const clone = <T>(value: T): T => structuredClone(value);
const touch = () => new Date().toISOString();

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

const matches = (needle: string, ...haystack: (string | undefined)[]) => {
  const query = normalizeFa(needle).toLowerCase();
  return haystack.some((value) =>
    normalizeFa(value ?? "").toLowerCase().includes(query),
  );
};

/* ========================================================================== */
/*  Pages                                                                     */
/* ========================================================================== */

export interface PageQuery {
  search?: string;
  status?: Page["status"] | "all";
  /** Only pages the public can currently reach. */
  liveOnly?: boolean;
}

export async function listPages(query: PageQuery = {}): Promise<Page[]> {
  const db = await readDb();
  let items = [...db.pages];

  if (query.liveOnly) items = items.filter(isLive);
  else if (query.status && query.status !== "all") {
    items = items.filter((page) => page.status === query.status);
  }

  if (query.search) {
    items = items.filter((page) =>
      matches(query.search as string, page.title, page.slug, page.excerpt),
    );
  }

  return clone(items).sort(byOrder);
}

/**
 * Looks a page up by its public path segment.
 *
 * The home page is stored with an empty slug, so `"/"`, `""` and `"home"` all
 * resolve to it — visitors and internal links use all three spellings.
 */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  const db = await readDb();
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  const wanted = normalized === "home" ? "" : normalized;
  return clone(db.pages.find((page) => page.slug === wanted) ?? null);
}

export async function getPageById(id: ID): Promise<Page | null> {
  const db = await readDb();
  return clone(db.pages.find((page) => page.id === id) ?? null);
}

export async function createPage(
  data: Omit<Page, "id" | "createdAt" | "updatedAt">,
): Promise<Page> {
  return mutate((db) => {
    const now = touch();
    const record: Page = { ...data, id: newId(), createdAt: now, updatedAt: now };
    db.pages.push(record);
    return clone(record);
  });
}

export async function updatePage(
  id: ID,
  patch: Partial<Page>,
): Promise<Page | null> {
  return mutate((db) => {
    const index = db.pages.findIndex((page) => page.id === id);
    if (index === -1) return null;

    const current = db.pages[index];
    /**
     * A system page's slug is what a hand-built route resolves against, so it
     * is not editable — silently keeping the stored value is safer than
     * trusting a form field that should never have carried one.
     */
    const slug = current.system ? current.slug : (patch.slug ?? current.slug);

    db.pages[index] = { ...current, ...patch, id, slug, updatedAt: touch() };
    return clone(db.pages[index]);
  });
}

export async function deletePage(id: ID): Promise<boolean> {
  return mutate((db) => {
    const target = db.pages.find((page) => page.id === id);
    if (!target || target.system) return false;

    db.pages = db.pages.filter((page) => page.id !== id);
    db.revisions = db.revisions.filter(
      (revision) => !(revision.entity === "page" && revision.entityId === id),
    );
    return true;
  });
}

/** Persists a whole reordered/edited section list in one write. */
export async function savePageSections(
  id: ID,
  sections: PageSection[],
): Promise<Page | null> {
  return mutate((db) => {
    const index = db.pages.findIndex((page) => page.id === id);
    if (index === -1) return null;

    db.pages[index] = {
      ...db.pages[index],
      sections: sections.map((section, position) => ({
        ...section,
        order: position,
      })),
      updatedAt: touch(),
    };
    return clone(db.pages[index]);
  });
}

export async function reorderPages(ids: ID[]): Promise<void> {
  await mutate((db) => {
    ids.forEach((id, position) => {
      const page = db.pages.find((item) => item.id === id);
      if (page) {
        page.order = position;
        page.updatedAt = touch();
      }
    });
  });
}

/* ========================================================================== */
/*  Media                                                                     */
/* ========================================================================== */

export interface MediaQuery {
  search?: string;
  kind?: MediaKind | "all";
  page?: number;
  pageSize?: number;
}

export interface MediaPage {
  items: MediaAsset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Aggregate size of every stored file, for the library header. */
  totalBytes: number;
  countsByKind: Record<MediaKind, number>;
}

export async function listMedia(query: MediaQuery = {}): Promise<MediaPage> {
  const db = await readDb();
  const { search, kind = "all", page = 1, pageSize = 24 } = query;

  let items = [...db.media];
  if (kind !== "all") items = items.filter((asset) => asset.kind === kind);
  if (search) {
    items = items.filter((asset) =>
      matches(search, asset.title, asset.alt, asset.fileName),
    );
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  const countsByKind: Record<MediaKind, number> = {
    image: 0,
    document: 0,
    video: 0,
    other: 0,
  };
  for (const asset of db.media) countsByKind[asset.kind] += 1;

  return {
    items: clone(items.slice(start, start + pageSize)),
    total,
    page: safePage,
    pageSize,
    totalPages,
    totalBytes: db.media.reduce((sum, asset) => sum + asset.size, 0),
    countsByKind,
  };
}

export async function getMediaById(id: ID): Promise<MediaAsset | null> {
  const db = await readDb();
  return clone(db.media.find((asset) => asset.id === id) ?? null);
}

export async function getMediaByUrl(url: string): Promise<MediaAsset | null> {
  const db = await readDb();
  return clone(db.media.find((asset) => asset.url === url) ?? null);
}

export async function createMedia(
  data: Omit<MediaAsset, "id" | "createdAt" | "updatedAt">,
): Promise<MediaAsset> {
  return mutate((db) => {
    const now = touch();
    const record: MediaAsset = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    db.media.unshift(record);
    return clone(record);
  });
}

export async function updateMedia(
  id: ID,
  patch: Partial<Pick<MediaAsset, "title" | "alt">>,
): Promise<MediaAsset | null> {
  return mutate((db) => {
    const index = db.media.findIndex((asset) => asset.id === id);
    if (index === -1) return null;
    db.media[index] = { ...db.media[index], ...patch, id, updatedAt: touch() };
    return clone(db.media[index]);
  });
}

export async function deleteMedia(id: ID): Promise<MediaAsset | null> {
  return mutate((db) => {
    const target = db.media.find((asset) => asset.id === id);
    if (!target) return null;
    db.media = db.media.filter((asset) => asset.id !== id);
    return clone(target);
  });
}

/**
 * Everywhere a media URL is referenced.
 *
 * Deleting a file that a live page still points at leaves a broken image, so
 * the confirmation dialog shows this list rather than discovering the problem
 * after the fact.
 */
export async function findMediaUsage(url: string): Promise<string[]> {
  if (!url) return [];
  const db = await readDb();
  const usage: string[] = [];

  const scan = (value: unknown): boolean => {
    if (typeof value === "string") return value === url;
    if (Array.isArray(value)) return value.some(scan);
    if (value && typeof value === "object") {
      return Object.values(value as Record<string, unknown>).some(scan);
    }
    return false;
  };

  for (const page of db.pages) {
    if (page.featuredImage === url || page.sections.some((s) => scan(s.data))) {
      usage.push(`صفحه «${page.title}»`);
    }
  }
  for (const article of db.articles) {
    if (article.coverImage === url) usage.push(`مقاله «${article.title}»`);
  }
  for (const person of db.arbitrators) {
    if (person.photoUrl === url) usage.push(`پروفایل «${person.fullName}»`);
  }
  for (const testimonial of db.testimonials) {
    if (testimonial.photoUrl === url) {
      usage.push(`نظر «${testimonial.authorName}»`);
    }
  }
  for (const category of db.categories) {
    if (category.imageUrl === url) usage.push(`دسته‌بندی «${category.title}»`);
  }

  const settings = db.settings;
  if (settings.logoUrl === url) usage.push("لوگوی سایت");
  if (settings.faviconUrl === url) usage.push("فاوآیکون سایت");
  if (settings.header?.logoUrl === url) usage.push("لوگوی هدر");
  if (settings.footer?.logoUrl === url) usage.push("لوگوی فوتر");
  if (settings.seo?.defaultOgImage === url) usage.push("تصویر پیش‌فرض اشتراک‌گذاری");

  return usage;
}

/* ========================================================================== */
/*  Categories                                                                */
/* ========================================================================== */

export async function listCategories(
  options: { publishedOnly?: boolean } = {},
): Promise<Category[]> {
  const db = await readDb();
  const items = options.publishedOnly
    ? db.categories.filter((category) => category.published)
    : db.categories;
  return clone(items).sort(byOrder);
}

export async function getCategoryById(id: ID): Promise<Category | null> {
  const db = await readDb();
  return clone(db.categories.find((category) => category.id === id) ?? null);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await readDb();
  return clone(db.categories.find((category) => category.slug === slug) ?? null);
}

export async function createCategory(
  data: Omit<Category, "id" | "createdAt" | "updatedAt">,
): Promise<Category> {
  return mutate((db) => {
    const now = touch();
    const record: Category = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    db.categories.push(record);
    return clone(record);
  });
}

export async function updateCategory(
  id: ID,
  patch: Partial<Category>,
): Promise<Category | null> {
  return mutate((db) => {
    const index = db.categories.findIndex((category) => category.id === id);
    if (index === -1) return null;

    const previousSlug = db.categories[index].slug;
    db.categories[index] = {
      ...db.categories[index],
      ...patch,
      id,
      updatedAt: touch(),
    };

    // Articles store the slug, so renaming one has to carry them along or
    // every article in the category would silently fall out of it.
    const nextSlug = db.categories[index].slug;
    if (patch.slug && nextSlug !== previousSlug) {
      for (const article of db.articles) {
        if (article.category === previousSlug) article.category = nextSlug;
      }
    }

    return clone(db.categories[index]);
  });
}

/**
 * Deletes a category.
 *
 * Refuses while articles still reference it — silently orphaning content is
 * worse than making the administrator reassign it first. The count comes back
 * so the UI can say exactly how many are in the way.
 */
export async function deleteCategory(
  id: ID,
): Promise<{ ok: true } | { ok: false; inUse: number }> {
  return mutate((db) => {
    const target = db.categories.find((category) => category.id === id);
    if (!target) return { ok: false, inUse: 0 } as const;

    const inUse = db.articles.filter(
      (article) => article.category === target.slug,
    ).length;
    if (inUse > 0) return { ok: false, inUse } as const;

    db.categories = db.categories.filter((category) => category.id !== id);
    return { ok: true } as const;
  });
}

export async function reorderCategories(ids: ID[]): Promise<void> {
  await mutate((db) => {
    ids.forEach((id, position) => {
      const category = db.categories.find((item) => item.id === id);
      if (category) {
        category.order = position;
        category.updatedAt = touch();
      }
    });
  });
}

/* ========================================================================== */
/*  Testimonials                                                              */
/* ========================================================================== */

export async function listTestimonials(
  options: { publishedOnly?: boolean; limit?: number } = {},
): Promise<Testimonial[]> {
  const db = await readDb();
  let items = options.publishedOnly
    ? db.testimonials.filter((item) => item.published)
    : [...db.testimonials];

  items = clone(items).sort(byOrder);
  return options.limit ? items.slice(0, options.limit) : items;
}

export async function getTestimonialById(id: ID): Promise<Testimonial | null> {
  const db = await readDb();
  return clone(db.testimonials.find((item) => item.id === id) ?? null);
}

export async function createTestimonial(
  data: Omit<Testimonial, "id" | "createdAt" | "updatedAt">,
): Promise<Testimonial> {
  return mutate((db) => {
    const now = touch();
    const record: Testimonial = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    db.testimonials.push(record);
    return clone(record);
  });
}

export async function updateTestimonial(
  id: ID,
  patch: Partial<Testimonial>,
): Promise<Testimonial | null> {
  return mutate((db) => {
    const index = db.testimonials.findIndex((item) => item.id === id);
    if (index === -1) return null;
    db.testimonials[index] = {
      ...db.testimonials[index],
      ...patch,
      id,
      updatedAt: touch(),
    };
    return clone(db.testimonials[index]);
  });
}

export async function deleteTestimonial(id: ID): Promise<boolean> {
  return mutate((db) => {
    const before = db.testimonials.length;
    db.testimonials = db.testimonials.filter((item) => item.id !== id);
    return db.testimonials.length < before;
  });
}

export async function reorderTestimonials(ids: ID[]): Promise<void> {
  await mutate((db) => {
    ids.forEach((id, position) => {
      const item = db.testimonials.find((entry) => entry.id === id);
      if (item) {
        item.order = position;
        item.updatedAt = touch();
      }
    });
  });
}

/* ========================================================================== */
/*  Newsletter                                                                */
/* ========================================================================== */

export async function listNewsletter(
  query: {
    status?: NewsletterStatus | "all";
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{
  items: NewsletterSubscriber[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await readDb();
  const { status = "all", search, page = 1, pageSize = 20 } = query;

  let items = [...db.newsletter];
  if (status !== "all") items = items.filter((entry) => entry.status === status);
  if (search) {
    items = items.filter((entry) => matches(search, entry.email, entry.name));
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: clone(items.slice(start, start + pageSize)),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * Idempotent subscribe.
 *
 * Re-subscribing an address that previously unsubscribed reactivates it rather
 * than creating a duplicate row, which is what a visitor pressing the button
 * again actually means.
 */
export async function subscribeToNewsletter(
  email: string,
  options: { name?: string; source?: string } = {},
): Promise<NewsletterSubscriber> {
  return mutate((db) => {
    const normalized = email.trim().toLowerCase();
    const now = touch();
    const existing = db.newsletter.find((entry) => entry.email === normalized);

    if (existing) {
      existing.status = existing.status === "unsubscribed" ? "new" : existing.status;
      if (options.name) existing.name = options.name;
      existing.updatedAt = now;
      return clone(existing);
    }

    const record: NewsletterSubscriber = {
      id: newId(),
      email: normalized,
      name: options.name,
      status: "new",
      source: options.source ?? "website",
      createdAt: now,
      updatedAt: now,
    };
    db.newsletter.push(record);
    return clone(record);
  });
}

export async function setNewsletterStatus(
  id: ID,
  status: NewsletterStatus,
): Promise<NewsletterSubscriber | null> {
  return mutate((db) => {
    const record = db.newsletter.find((entry) => entry.id === id);
    if (!record) return null;
    record.status = status;
    record.updatedAt = touch();
    return clone(record);
  });
}

export async function deleteNewsletterSubscriber(id: ID): Promise<boolean> {
  return mutate((db) => {
    const before = db.newsletter.length;
    db.newsletter = db.newsletter.filter((entry) => entry.id !== id);
    return db.newsletter.length < before;
  });
}

/* ========================================================================== */
/*  Settings groups                                                           */
/* ========================================================================== */

/**
 * Each configuration group is written on its own so two administrators editing
 * different screens cannot clobber each other's work with a whole-object PUT.
 */

export async function updateHeaderSettings(
  patch: Partial<HeaderSettings>,
): Promise<HeaderSettings> {
  return mutate((db) => {
    db.settings.header = { ...db.settings.header, ...patch };
    db.settings.updatedAt = touch();
    return clone(db.settings.header);
  });
}

export async function updateFooterSettings(
  patch: Partial<FooterSettings>,
): Promise<FooterSettings> {
  return mutate((db) => {
    db.settings.footer = { ...db.settings.footer, ...patch };
    db.settings.updatedAt = touch();
    return clone(db.settings.footer);
  });
}

export async function updateBrandingSettings(
  patch: Partial<BrandingSettings>,
): Promise<BrandingSettings> {
  return mutate((db) => {
    db.settings.branding = { ...db.settings.branding, ...patch };
    db.settings.updatedAt = touch();
    return clone(db.settings.branding);
  });
}

export async function updateSeoSettings(
  patch: Partial<SeoSettings>,
): Promise<SeoSettings> {
  return mutate((db) => {
    db.settings.seo = { ...db.settings.seo, ...patch };
    db.settings.updatedAt = touch();
    return clone(db.settings.seo);
  });
}

export async function updateCustomCodeSettings(
  patch: Partial<CustomCodeSettings>,
): Promise<CustomCodeSettings> {
  return mutate((db) => {
    db.settings.customCode = { ...db.settings.customCode, ...patch };
    db.settings.updatedAt = touch();
    return clone(db.settings.customCode);
  });
}

export async function updateAppointmentSettings(
  patch: Partial<AppointmentSettings>,
): Promise<AppointmentSettings> {
  return mutate((db) => {
    db.settings.appointments = { ...db.settings.appointments, ...patch };
    db.settings.updatedAt = touch();
    return clone(db.settings.appointments);
  });
}

/* ========================================================================== */
/*  Revisions                                                                 */
/* ========================================================================== */

/**
 * Snapshots an entity before it is overwritten.
 *
 * Called on the *previous* value, so the newest revision is always "the state
 * before the most recent save" and restoring it undoes exactly one edit. The
 * per-entity cap keeps an in-memory store from growing without bound.
 */
export async function recordRevision(input: {
  entity: RevisionEntity;
  entityId: ID;
  label: string;
  authorId: ID;
  authorName: string;
  snapshot: unknown;
  note?: string;
}): Promise<void> {
  await mutate((db) => {
    db.revisions.push({
      id: newId(),
      entity: input.entity,
      entityId: input.entityId,
      label: input.label,
      at: touch(),
      authorId: input.authorId,
      authorName: input.authorName,
      note: input.note,
      snapshot: structuredClone(input.snapshot),
    });

    const forEntity = db.revisions.filter(
      (revision) =>
        revision.entity === input.entity && revision.entityId === input.entityId,
    );

    if (forEntity.length > MAX_REVISIONS_PER_ENTITY) {
      const excess = forEntity
        .sort((a, b) => a.at.localeCompare(b.at))
        .slice(0, forEntity.length - MAX_REVISIONS_PER_ENTITY)
        .map((revision) => revision.id);

      db.revisions = db.revisions.filter(
        (revision) => !excess.includes(revision.id),
      );
    }
  });
}

export async function listRevisions(
  entity: RevisionEntity,
  entityId: ID,
): Promise<Revision[]> {
  const db = await readDb();
  return clone(
    db.revisions
      .filter(
        (revision) =>
          revision.entity === entity && revision.entityId === entityId,
      )
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
}

export async function getRevision(id: ID): Promise<Revision | null> {
  const db = await readDb();
  return clone(db.revisions.find((revision) => revision.id === id) ?? null);
}

/**
 * Every settings revision, newest first.
 *
 * Configuration is versioned per group, so the history screen wants them
 * interleaved by time rather than one query per group.
 */
export async function listSettingsRevisions(limit = 60): Promise<Revision[]> {
  const db = await readDb();
  return clone(
    db.revisions
      .filter((revision) => revision.entity === "settings")
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit),
  );
}

/** Most recent revisions across everything — for the dashboard. */
export async function listRecentRevisions(limit = 8): Promise<Revision[]> {
  const db = await readDb();
  return clone(
    [...db.revisions].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit),
  );
}

/* ========================================================================== */
/*  SMS log                                                                   */
/* ========================================================================== */

export interface SmsLogInput {
  to: string;
  purpose: SmsPurpose;
  body: string;
  status: SmsDeliveryStatus;
  provider?: string;
  providerMessageId?: string;
  error?: string;
  entityType?: "request" | "appointment";
  entityId?: ID;
  sentById?: ID;
  sentByName?: string;
}

/**
 * Appends an SMS log entry.
 *
 * Like the audit log this never throws — failing to record a send must not
 * turn a delivered message into an error the visitor sees. Also like the audit
 * log it is capped, because it grows on every send.
 */
export async function recordSms(input: SmsLogInput): Promise<void> {
  try {
    await mutate((db) => {
      db.smsLog.push({
        id: newId(),
        provider: "sms.ir",
        createdAt: touch(),
        ...input,
      });
      if (db.smsLog.length > MAX_SMS_LOG_ENTRIES) {
        db.smsLog = db.smsLog.slice(-MAX_SMS_LOG_ENTRIES);
      }
    });
  } catch (error) {
    console.error("[sms] could not record log entry", error);
  }
}

export interface SmsLogQuery {
  purpose?: SmsPurpose | "all";
  status?: SmsDeliveryStatus | "all";
  entityId?: ID;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listSmsLog(query: SmsLogQuery = {}): Promise<{
  items: SmsLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await readDb();
  const {
    purpose = "all",
    status = "all",
    entityId,
    search,
    page = 1,
    pageSize = 25,
  } = query;

  let items = [...db.smsLog];
  if (purpose !== "all") items = items.filter((entry) => entry.purpose === purpose);
  if (status !== "all") items = items.filter((entry) => entry.status === status);
  if (entityId) items = items.filter((entry) => entry.entityId === entityId);
  if (search) {
    items = items.filter((entry) => matches(search, entry.to, entry.body));
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: clone(items.slice(start, start + pageSize)),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/** Messages already sent about one record, newest first. */
export async function listSmsForEntity(
  entityId: ID,
  limit = 10,
): Promise<SmsLogEntry[]> {
  const db = await readDb();
  return clone(
    db.smsLog
      .filter((entry) => entry.entityId === entityId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  );
}

export async function updateSmsSettings(
  patch: Partial<SmsSettings>,
): Promise<SmsSettings> {
  return mutate((db) => {
    db.settings.sms = { ...db.settings.sms, ...patch };
    db.settings.updatedAt = touch();
    return clone(db.settings.sms);
  });
}

/* ========================================================================== */
/*  Audit log                                                                 */
/* ========================================================================== */

export interface AuditInput {
  actorId: ID;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: ID;
  entityLabel: string;
  detail?: string;
  ip?: string;
}

/**
 * Appends an audit entry.
 *
 * Deliberately never throws: an audit write failing must not roll back the
 * operation the administrator actually asked for. A dropped log line is a
 * lesser failure than a page that silently refuses to save.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await mutate((db) => {
      db.auditLog.push({ id: newId(), at: touch(), ...input });
      if (db.auditLog.length > MAX_AUDIT_ENTRIES) {
        db.auditLog = db.auditLog.slice(-MAX_AUDIT_ENTRIES);
      }
    });
  } catch (error) {
    console.error("[audit] could not record entry", error);
  }
}

export interface AuditQuery {
  actorId?: ID;
  entity?: AuditEntity | "all";
  action?: AuditAction | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLog(query: AuditQuery = {}): Promise<{
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = await readDb();
  const { actorId, entity = "all", action = "all", search, page = 1, pageSize = 25 } =
    query;

  let items = [...db.auditLog];
  if (actorId) items = items.filter((entry) => entry.actorId === actorId);
  if (entity !== "all") items = items.filter((entry) => entry.entity === entity);
  if (action !== "all") items = items.filter((entry) => entry.action === action);
  if (search) {
    items = items.filter((entry) =>
      matches(search, entry.entityLabel, entry.actorName, entry.detail),
    );
  }

  items.sort((a, b) => b.at.localeCompare(a.at));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: clone(items.slice(start, start + pageSize)),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function listRecentActivity(limit = 8): Promise<AuditLogEntry[]> {
  const db = await readDb();
  return clone(
    [...db.auditLog].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit),
  );
}
