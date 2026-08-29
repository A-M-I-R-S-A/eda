import "server-only";

import type {
  Appointment,
  AppointmentStatus,
  Arbitrator,
  Article,
  ArticleCategorySlug,
  ConsultationRequest,
  ContactMessage,
  ContactMessageStatus,
  FaqItem,
  ID,
  InternalNote,
  PublicUser,
  RequestStatus,
  SiteSettings,
  User,
  UserRole,
} from "@/types";
import { newId } from "@/lib/utils/id";
import { normalizeFa } from "@/lib/utils/persian";
import { toISODateString } from "@/lib/utils/jalali";
import { isLive } from "@/lib/cms/status";
import { mutate, readDb } from "./store";

/**
 * The CMS half of the repository layer — pages, sections, media, categories,
 * testimonials, the newsletter, revisions and the audit log. Re-exported so
 * every consumer keeps a single `@/lib/db` import.
 */
export * from "./cms";

/**
 * Repository layer — the only module the rest of the app imports for data.
 *
 * Everything returned is a deep clone, so a caller mutating a result can never
 * corrupt the in-memory snapshot. Every write goes through `mutate()`, which
 * serialises and persists.
 */

const clone = <T>(value: T): T => structuredClone(value);

const touch = () => new Date().toISOString();

/**
 * Today as a *local* `YYYY-MM-DD`.
 *
 * Appointment dates are captured in the visitor's local calendar, so they must
 * be compared against a local date string. Using `toISOString().slice(0,10)`
 * here would shift the boundary by up to a day for any timezone offset and
 * silently hide "today's" appointments.
 */
const todayIso = () => toISODateString(new Date());

/* -------------------------------------------------------------------------- */
/*  Settings                                                                  */
/* -------------------------------------------------------------------------- */

export async function getSettings(): Promise<SiteSettings> {
  const db = await readDb();
  return clone(db.settings);
}

export async function updateSettings(
  patch: Partial<Omit<SiteSettings, "id" | "createdAt">>,
): Promise<SiteSettings> {
  return mutate((db) => {
    db.settings = { ...db.settings, ...patch, id: "site", updatedAt: touch() };
    return clone(db.settings);
  });
}

/* -------------------------------------------------------------------------- */
/*  Arbitrators                                                               */
/* -------------------------------------------------------------------------- */

export async function listArbitrators(
  options: { publishedOnly?: boolean; bookableOnly?: boolean } = {},
): Promise<Arbitrator[]> {
  const db = await readDb();
  let items = db.arbitrators;
  if (options.publishedOnly) items = items.filter((a) => a.published);
  if (options.bookableOnly) items = items.filter((a) => a.bookable);
  return clone(items).sort((a, b) => a.order - b.order);
}

/**
 * The institution's arbitrator.
 *
 * The organisation has exactly one, so public pages ask for *the* arbitrator
 * rather than iterating a list. If the institution later grows, the record
 * with the lowest `order` remains the principal and additional profiles are
 * reachable at `/arbitrator/<slug>` — no page needs rewriting.
 */
export async function getPrincipalArbitrator(
  options: { publishedOnly?: boolean } = { publishedOnly: true },
): Promise<Arbitrator | null> {
  const items = await listArbitrators({ publishedOnly: options.publishedOnly });
  return items[0] ?? null;
}

/** Published arbitrators other than the principal — empty in the normal case. */
export async function listAdditionalArbitrators(): Promise<Arbitrator[]> {
  const items = await listArbitrators({ publishedOnly: true });
  return items.slice(1);
}

export async function getArbitratorBySlug(
  slug: string,
): Promise<Arbitrator | null> {
  const db = await readDb();
  return clone(db.arbitrators.find((a) => a.slug === slug) ?? null);
}

export async function getArbitratorById(id: ID): Promise<Arbitrator | null> {
  const db = await readDb();
  return clone(db.arbitrators.find((a) => a.id === id) ?? null);
}

export async function createArbitrator(
  data: Omit<Arbitrator, "id" | "createdAt" | "updatedAt">,
): Promise<Arbitrator> {
  return mutate((db) => {
    const now = touch();
    const record: Arbitrator = { ...data, id: newId(), createdAt: now, updatedAt: now };
    db.arbitrators.push(record);
    return clone(record);
  });
}

export async function updateArbitrator(
  id: ID,
  patch: Partial<Arbitrator>,
): Promise<Arbitrator | null> {
  return mutate((db) => {
    const index = db.arbitrators.findIndex((a) => a.id === id);
    if (index === -1) return null;
    db.arbitrators[index] = {
      ...db.arbitrators[index],
      ...patch,
      id,
      updatedAt: touch(),
    };
    return clone(db.arbitrators[index]);
  });
}

export async function deleteArbitrator(id: ID): Promise<boolean> {
  return mutate((db) => {
    const before = db.arbitrators.length;
    db.arbitrators = db.arbitrators.filter((a) => a.id !== id);
    return db.arbitrators.length < before;
  });
}

export async function reorderArbitrators(ids: ID[]): Promise<void> {
  await mutate((db) => {
    ids.forEach((id, position) => {
      const person = db.arbitrators.find((a) => a.id === id);
      if (person) {
        person.order = position;
        person.updatedAt = touch();
      }
    });
  });
}

/* -------------------------------------------------------------------------- */
/*  Articles                                                                  */
/* -------------------------------------------------------------------------- */

export interface ArticleQuery {
  category?: ArticleCategorySlug | "all";
  search?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
  /** Public reads: only articles whose publication moment has arrived. */
  publishedOnly?: boolean;
  featuredOnly?: boolean;
  /** Admin reads: filter by the stored workflow status. */
  status?: Article["status"] | "all";
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listArticles(
  query: ArticleQuery = {},
): Promise<Paginated<Article>> {
  const db = await readDb();
  const {
    category = "all",
    search,
    tag,
    page = 1,
    pageSize = 9,
    publishedOnly = false,
    featuredOnly = false,
    status = "all",
  } = query;

  let items = [...db.articles];
  if (publishedOnly) items = items.filter(isLive);
  if (status !== "all") items = items.filter((a) => a.status === status);
  if (featuredOnly) items = items.filter((a) => a.featured);
  if (category !== "all") items = items.filter((a) => a.category === category);
  if (tag) items = items.filter((a) => a.tags.includes(tag));

  if (search) {
    const needle = normalizeFa(search).toLowerCase();
    items = items.filter((a) =>
      [a.title, a.excerpt, a.body, a.tags.join(" ")]
        .map((v) => normalizeFa(v).toLowerCase())
        .some((v) => v.includes(needle)),
    );
  }

  items.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
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

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = await readDb();
  return clone(db.articles.find((a) => a.slug === slug) ?? null);
}

export async function getArticleById(id: ID): Promise<Article | null> {
  const db = await readDb();
  return clone(db.articles.find((a) => a.id === id) ?? null);
}

/** Same category first, then most recent. */
export async function getRelatedArticles(
  article: Article,
  limit = 3,
): Promise<Article[]> {
  const db = await readDb();
  const pool = db.articles.filter((a) => isLive(a) && a.id !== article.id);
  pool.sort((a, b) => {
    const score = (x: Article) => (x.category === article.category ? 1 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
  return clone(pool.slice(0, limit));
}

export async function createArticle(
  data: Omit<Article, "id" | "createdAt" | "updatedAt">,
): Promise<Article> {
  return mutate((db) => {
    const now = touch();
    const record: Article = { ...data, id: newId(), createdAt: now, updatedAt: now };
    db.articles.push(record);
    return clone(record);
  });
}

export async function updateArticle(
  id: ID,
  patch: Partial<Article>,
): Promise<Article | null> {
  return mutate((db) => {
    const index = db.articles.findIndex((a) => a.id === id);
    if (index === -1) return null;
    db.articles[index] = { ...db.articles[index], ...patch, id, updatedAt: touch() };
    return clone(db.articles[index]);
  });
}

export async function deleteArticle(id: ID): Promise<boolean> {
  return mutate((db) => {
    const before = db.articles.length;
    db.articles = db.articles.filter((a) => a.id !== id);
    return db.articles.length < before;
  });
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

export async function listFaqs(
  options: { publishedOnly?: boolean; topic?: string; limit?: number } = {},
): Promise<FaqItem[]> {
  const db = await readDb();
  let items = options.publishedOnly
    ? db.faqs.filter((f) => f.published)
    : [...db.faqs];

  if (options.topic) items = items.filter((f) => f.topic === options.topic);

  const sorted = clone(items).sort((a, b) => a.order - b.order);
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

/** Distinct topics currently in use, for the FAQ filter and section picker. */
export async function listFaqTopics(): Promise<string[]> {
  const db = await readDb();
  return [...new Set(db.faqs.map((f) => f.topic).filter(Boolean))].sort();
}

export async function getFaqsByIds(ids: ID[]): Promise<FaqItem[]> {
  const db = await readDb();
  return clone(db.faqs.filter((f) => ids.includes(f.id) && f.published));
}

export async function getFaqById(id: ID): Promise<FaqItem | null> {
  const db = await readDb();
  return clone(db.faqs.find((f) => f.id === id) ?? null);
}

export async function createFaq(
  data: Omit<FaqItem, "id" | "createdAt" | "updatedAt">,
): Promise<FaqItem> {
  return mutate((db) => {
    const now = touch();
    const record: FaqItem = { ...data, id: newId(), createdAt: now, updatedAt: now };
    db.faqs.push(record);
    return clone(record);
  });
}

export async function updateFaq(
  id: ID,
  patch: Partial<FaqItem>,
): Promise<FaqItem | null> {
  return mutate((db) => {
    const index = db.faqs.findIndex((f) => f.id === id);
    if (index === -1) return null;
    db.faqs[index] = { ...db.faqs[index], ...patch, id, updatedAt: touch() };
    return clone(db.faqs[index]);
  });
}

export async function deleteFaq(id: ID): Promise<boolean> {
  return mutate((db) => {
    const before = db.faqs.length;
    db.faqs = db.faqs.filter((f) => f.id !== id);
    return db.faqs.length < before;
  });
}

export async function reorderFaqs(ids: ID[]): Promise<void> {
  await mutate((db) => {
    ids.forEach((id, position) => {
      const faq = db.faqs.find((f) => f.id === id);
      if (faq) {
        faq.order = position;
        faq.updatedAt = touch();
      }
    });
  });
}

/* -------------------------------------------------------------------------- */
/*  Consultation requests                                                     */
/* -------------------------------------------------------------------------- */

export interface RequestQuery {
  status?: RequestStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listRequests(
  query: RequestQuery = {},
): Promise<Paginated<ConsultationRequest>> {
  const db = await readDb();
  const { status = "all", search, page = 1, pageSize = 12 } = query;

  let items = [...db.requests];
  if (status !== "all") items = items.filter((r) => r.status === status);

  if (search) {
    const needle = normalizeFa(search).toLowerCase();
    items = items.filter((r) =>
      [r.trackingCode, r.fullName, r.phone, r.subject, r.legalArea]
        .map((v) => normalizeFa(v ?? "").toLowerCase())
        .some((v) => v.includes(needle)),
    );
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

export async function getRequestById(
  id: ID,
): Promise<ConsultationRequest | null> {
  const db = await readDb();
  return clone(db.requests.find((r) => r.id === id) ?? null);
}

/**
 * Tracking lookup. Requires BOTH the code and the phone number that submitted
 * it — a tracking code alone must never expose case details.
 */
export async function findRequestForTracking(
  trackingCode: string,
  phone: string,
): Promise<ConsultationRequest | null> {
  const db = await readDb();
  const code = trackingCode.trim().toUpperCase();
  const found = db.requests.find(
    (r) => r.trackingCode.toUpperCase() === code && r.phone === phone,
  );
  return clone(found ?? null);
}

export async function createRequest(
  data: Omit<ConsultationRequest, "id" | "createdAt" | "updatedAt">,
): Promise<ConsultationRequest> {
  return mutate((db) => {
    const now = touch();
    const record: ConsultationRequest = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    db.requests.push(record);
    return clone(record);
  });
}

export async function setRequestStatus(
  id: ID,
  status: RequestStatus,
  options: { note?: string; byName?: string } = {},
): Promise<ConsultationRequest | null> {
  return mutate((db) => {
    const record = db.requests.find((r) => r.id === id);
    if (!record) return null;
    const now = touch();
    record.status = status;
    record.timeline.push({ status, at: now, note: options.note, byName: options.byName });
    record.updatedAt = now;
    return clone(record);
  });
}

export async function updateRequest(
  id: ID,
  patch: Partial<ConsultationRequest>,
): Promise<ConsultationRequest | null> {
  return mutate((db) => {
    const index = db.requests.findIndex((r) => r.id === id);
    if (index === -1) return null;
    db.requests[index] = { ...db.requests[index], ...patch, id, updatedAt: touch() };
    return clone(db.requests[index]);
  });
}

export async function addRequestNote(
  id: ID,
  note: Omit<InternalNote, "id" | "createdAt">,
): Promise<ConsultationRequest | null> {
  return mutate((db) => {
    const record = db.requests.find((r) => r.id === id);
    if (!record) return null;
    const now = touch();
    record.notes.push({ ...note, id: newId(), createdAt: now });
    record.updatedAt = now;
    return clone(record);
  });
}

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

export interface AppointmentQuery {
  status?: AppointmentStatus | "all";
  arbitratorId?: ID;
  date?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  scope?: "all" | "today" | "upcoming" | "past";
}

export async function listAppointments(
  query: AppointmentQuery = {},
): Promise<Paginated<Appointment>> {
  const db = await readDb();
  const {
    status = "all",
    arbitratorId,
    date,
    search,
    page = 1,
    pageSize = 12,
    scope = "all",
  } = query;

  const today = todayIso();

  let items = [...db.appointments];
  if (status !== "all") items = items.filter((a) => a.status === status);
  if (arbitratorId) items = items.filter((a) => a.arbitratorId === arbitratorId);
  if (date) items = items.filter((a) => a.date === date);

  if (scope === "today") items = items.filter((a) => a.date === today);
  if (scope === "upcoming") items = items.filter((a) => a.date > today);
  if (scope === "past") items = items.filter((a) => a.date < today);

  if (search) {
    const needle = normalizeFa(search).toLowerCase();
    items = items.filter((a) =>
      [a.bookingCode, a.fullName, a.phone, a.subject, a.arbitratorName]
        .map((v) => normalizeFa(v ?? "").toLowerCase())
        .some((v) => v.includes(needle)),
    );
  }

  items.sort((a, b) => {
    const diff = b.date.localeCompare(a.date);
    return diff !== 0 ? diff : b.time.localeCompare(a.time);
  });

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

export async function getAppointmentById(id: ID): Promise<Appointment | null> {
  const db = await readDb();
  return clone(db.appointments.find((a) => a.id === id) ?? null);
}

export async function findAppointmentForTracking(
  bookingCode: string,
  phone: string,
): Promise<Appointment | null> {
  const db = await readDb();
  const code = bookingCode.trim().toUpperCase();
  const found = db.appointments.find(
    (a) => a.bookingCode.toUpperCase() === code && a.phone === phone,
  );
  return clone(found ?? null);
}

/** Slots already taken for an arbitrator on a given day. */
export async function getBookedTimes(
  arbitratorId: ID,
  date: string,
): Promise<string[]> {
  const db = await readDb();
  return db.appointments
    .filter(
      (a) =>
        a.arbitratorId === arbitratorId &&
        a.date === date &&
        a.status !== "cancelled" &&
        a.status !== "rejected",
    )
    .map((a) => a.time);
}

export async function createAppointment(
  data: Omit<Appointment, "id" | "createdAt" | "updatedAt">,
): Promise<Appointment> {
  return mutate((db) => {
    const now = touch();
    const record: Appointment = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    db.appointments.push(record);
    return clone(record);
  });
}

export async function setAppointmentStatus(
  id: ID,
  status: AppointmentStatus,
  options: { note?: string; byName?: string } = {},
): Promise<Appointment | null> {
  return mutate((db) => {
    const record = db.appointments.find((a) => a.id === id);
    if (!record) return null;
    const now = touch();
    record.status = status;
    record.timeline.push({ status, at: now, note: options.note, byName: options.byName });
    record.updatedAt = now;
    return clone(record);
  });
}

export async function rescheduleAppointment(
  id: ID,
  date: string,
  time: string,
  byName?: string,
): Promise<Appointment | null> {
  return mutate((db) => {
    const record = db.appointments.find((a) => a.id === id);
    if (!record) return null;
    const now = touch();
    record.date = date;
    record.time = time;
    record.status = "rescheduled";
    record.timeline.push({
      status: "rescheduled",
      at: now,
      note: `زمان جدید: ${date} ساعت ${time}`,
      byName,
    });
    record.updatedAt = now;
    return clone(record);
  });
}

export async function addAppointmentNote(
  id: ID,
  note: Omit<InternalNote, "id" | "createdAt">,
): Promise<Appointment | null> {
  return mutate((db) => {
    const record = db.appointments.find((a) => a.id === id);
    if (!record) return null;
    const now = touch();
    record.notes.push({ ...note, id: newId(), createdAt: now });
    record.updatedAt = now;
    return clone(record);
  });
}

/* -------------------------------------------------------------------------- */
/*  Contact messages                                                          */
/* -------------------------------------------------------------------------- */

export async function listMessages(
  query: {
    status?: ContactMessageStatus | "all";
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Paginated<ContactMessage>> {
  const db = await readDb();
  const { status = "all", search, page = 1, pageSize = 15 } = query;

  let items = [...db.messages];
  if (status !== "all") items = items.filter((m) => m.status === status);

  if (search) {
    const needle = normalizeFa(search).toLowerCase();
    items = items.filter((m) =>
      [m.fullName, m.phone, m.email, m.subject, m.message]
        .map((v) => normalizeFa(v ?? "").toLowerCase())
        .some((v) => v.includes(needle)),
    );
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

export async function createMessage(
  data: Omit<ContactMessage, "id" | "createdAt" | "updatedAt">,
): Promise<ContactMessage> {
  return mutate((db) => {
    const now = touch();
    const record: ContactMessage = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    db.messages.push(record);
    return clone(record);
  });
}

export async function setMessageStatus(
  id: ID,
  status: ContactMessageStatus,
): Promise<ContactMessage | null> {
  return mutate((db) => {
    const record = db.messages.find((m) => m.id === id);
    if (!record) return null;
    record.status = status;
    record.updatedAt = touch();
    return clone(record);
  });
}

export async function getMessageById(id: ID): Promise<ContactMessage | null> {
  const db = await readDb();
  return clone(db.messages.find((m) => m.id === id) ?? null);
}

export async function addMessageNote(
  id: ID,
  note: Omit<InternalNote, "id" | "createdAt">,
): Promise<ContactMessage | null> {
  return mutate((db) => {
    const record = db.messages.find((m) => m.id === id);
    if (!record) return null;
    const now = touch();
    // Snapshots written before notes existed still load, so guard the array.
    record.notes = [...(record.notes ?? []), { ...note, id: newId(), createdAt: now }];
    record.updatedAt = now;
    return clone(record);
  });
}

export async function deleteMessage(id: ID): Promise<boolean> {
  return mutate((db) => {
    const before = db.messages.length;
    db.messages = db.messages.filter((m) => m.id !== id);
    return db.messages.length < before;
  });
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

const toPublicUser = (user: User): PublicUser => {
  const { passwordHash: _passwordHash, ...rest } = user;
  return clone(rest);
};

export async function listUsers(
  query: {
    search?: string;
    /** `"staff"` excludes public visitors from the administrator roster. */
    role?: UserRole | "all" | "staff";
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Paginated<PublicUser>> {
  const db = await readDb();
  const { search, role = "all", page = 1, pageSize = 15 } = query;

  let items = [...db.users];

  if (role === "staff") items = items.filter((u) => u.role !== "client");
  else if (role !== "all") items = items.filter((u) => u.role === role);

  if (search) {
    const needle = normalizeFa(search).toLowerCase();
    items = items.filter((u) =>
      [u.fullName, u.email, u.phone]
        .map((v) => normalizeFa(v ?? "").toLowerCase())
        .some((v) => v.includes(needle)),
    );
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize).map(toPublicUser),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function createUser(
  data: Omit<User, "id" | "createdAt" | "updatedAt">,
): Promise<PublicUser> {
  return mutate((db) => {
    const now = touch();
    const record: User = {
      ...data,
      email: data.email.trim().toLowerCase(),
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(record);
    return toPublicUser(record);
  });
}

/** Includes the password hash — for the authentication flow only. */
export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await readDb();
  const normalized = email.trim().toLowerCase();
  return clone(db.users.find((u) => u.email.toLowerCase() === normalized) ?? null);
}

export async function getUserById(id: ID): Promise<PublicUser | null> {
  const db = await readDb();
  const user = db.users.find((u) => u.id === id);
  return user ? toPublicUser(user) : null;
}

export async function updateUser(
  id: ID,
  patch: Partial<User>,
): Promise<PublicUser | null> {
  return mutate((db) => {
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    db.users[index] = { ...db.users[index], ...patch, id, updatedAt: touch() };
    return toPublicUser(db.users[index]);
  });
}

export async function deleteUser(id: ID): Promise<boolean> {
  return mutate((db) => {
    const before = db.users.length;
    db.users = db.users.filter((u) => u.id !== id);
    return db.users.length < before;
  });
}

export async function recordLogin(id: ID): Promise<void> {
  await mutate((db) => {
    const user = db.users.find((u) => u.id === id);
    if (user) {
      user.lastLoginAt = touch();
      user.updatedAt = user.lastLoginAt;
    }
  });
}

/* -------------------------------------------------------------------------- */
/*  Dashboard aggregates                                                      */
/* -------------------------------------------------------------------------- */

export interface DashboardStats {
  totalUsers: number;
  newRequests: number;
  pendingRequests: number;
  todayAppointments: number;
  upcomingAppointments: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  scheduledArticles: number;
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  totalMedia: number;
  mediaBytes: number;
  totalFaqs: number;
  totalTestimonials: number;
  newsletterSubscribers: number;
  adminUsers: number;
  unreadMessages: number;
  requestsByStatus: { status: RequestStatus; count: number }[];
  appointmentsByMode: { mode: string; count: number }[];
  /** Last 8 weeks of request volume, oldest first. */
  weeklyRequests: { label: string; value: number; iso: string }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await readDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isoToday = todayIso();

  const statuses: RequestStatus[] = [
    "submitted",
    "in-review",
    "approved",
    "needs-info",
    "scheduled",
    "completed",
    "cancelled",
  ];

  const weeklyRequests: DashboardStats["weeklyRequests"] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const end = new Date(today);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const count = db.requests.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime() + 86_399_999;
    }).length;

    weeklyRequests.push({ label: "", value: count, iso: toISODateString(end) });
  }

  return {
    totalUsers: db.users.filter((u) => u.role === "client").length,
    newRequests: db.requests.filter((r) => r.status === "submitted").length,
    pendingRequests: db.requests.filter((r) =>
      ["submitted", "in-review", "needs-info"].includes(r.status),
    ).length,
    todayAppointments: db.appointments.filter(
      (a) => a.date === isoToday && a.status !== "cancelled",
    ).length,
    upcomingAppointments: db.appointments.filter(
      (a) => a.date > isoToday && !["cancelled", "rejected"].includes(a.status),
    ).length,
    totalArticles: db.articles.length,
    publishedArticles: db.articles.filter(isLive).length,
    draftArticles: db.articles.filter((a) => a.status === "draft").length,
    scheduledArticles: db.articles.filter((a) => a.status === "scheduled").length,
    totalPages: db.pages.length,
    publishedPages: db.pages.filter(isLive).length,
    draftPages: db.pages.filter((p) => p.status === "draft").length,
    totalMedia: db.media.length,
    mediaBytes: db.media.reduce((sum, asset) => sum + asset.size, 0),
    totalFaqs: db.faqs.length,
    totalTestimonials: db.testimonials.length,
    newsletterSubscribers: db.newsletter.filter(
      (entry) => entry.status !== "unsubscribed",
    ).length,
    adminUsers: db.users.filter((u) => u.role !== "client").length,
    unreadMessages: db.messages.filter((m) => m.status === "new").length,
    requestsByStatus: statuses.map((status) => ({
      status,
      count: db.requests.filter((r) => r.status === status).length,
    })),
    appointmentsByMode: (["in-person", "online", "phone"] as const).map((mode) => ({
      mode,
      count: db.appointments.filter((a) => a.meetingMode === mode).length,
    })),
    weeklyRequests,
  };
}
