"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { SubmissionStatus } from "@/types";
import {
  addAppointmentNote,
  addMessageNote,
  addRequestNote,
  createArbitrator,
  createArticle,
  createFaq,
  createService,
  createUser,
  deleteArbitrator,
  deleteArticle,
  deleteFaq,
  deleteMessage,
  deleteService,
  deleteUser,
  findUserByEmail,
  getArbitratorById,
  getArticleById,
  getFaqById,
  getMessageById,
  getServiceById,
  getUserById,
  listArbitrators,
  listArticles,
  listCategories,
  listServices,
  recordRevision,
  rescheduleAppointment,
  setAppointmentStatus,
  setMessageStatus,
  setRequestStatus,
  updateArbitrator,
  updateArticle,
  updateFaq,
  updateService,
  updateSettings,
  updateUser,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { hashPassword } from "@/lib/auth/password";
import { parseCredentials } from "@/lib/cms/credentials";
import { resolvePublication } from "@/lib/cms/status";
import { estimateReadingMinutes } from "@/lib/utils/persian";
import { toPlainText } from "@/lib/content/rich-text";
import { uniqueSlug } from "@/lib/utils/slug";
import {
  adminUserFormSchema,
  appointmentStatusEnum,
  arbitratorFormSchema,
  articleFormSchema,
  faqFormSchema,
  noteSchema,
  requestStatusEnum,
  rescheduleSchema,
  serviceFormSchema,
  settingsFormSchema,
  statusChangeSchema,
  toFieldErrors,
  userStatusSchema,
} from "@/lib/validation/schemas";
import {
  audit,
  bool,
  guard,
  MESSAGES,
  readSocialLinks,
  rows,
  text,
} from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Admin Server Actions for the operational and long-form-content surfaces.
 *
 * Every one runs the same three gates before touching data — session plus
 * capability, CSRF token, zod validation — and every successful mutation
 * writes an audit entry. Content that supports version history is snapshotted
 * *before* it is overwritten, so restoring a revision undoes exactly one edit.
 *
 * Capabilities, not role ranks: content actions ask for `content`, the
 * enquiry and appointment queues ask for `operations`, configuration asks for
 * `settings`. See `@/lib/auth/permissions`.
 */

const lines = (formData: FormData, name: string) => text(formData, name);

/* -------------------------------------------------------------------------- */
/*  Consultation requests                                                     */
/* -------------------------------------------------------------------------- */

export async function updateRequestStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const parsed = statusChangeSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  const status = requestStatusEnum.safeParse(parsed.data.status);
  if (!status.success) return errorState("وضعیت انتخاب‌شده معتبر نیست.");

  try {
    const updated = await setRequestStatus(parsed.data.id, status.data, {
      note: parsed.data.note,
      byName: gate.session.name,
    });
    if (!updated) return errorState("درخواست مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "status",
      entity: "request",
      entityId: updated.id,
      entityLabel: updated.trackingCode,
      detail: status.data,
    });

    revalidatePath(ROUTES.admin.requests);
    revalidatePath(ROUTES.admin.request(parsed.data.id));
    revalidatePath(ROUTES.admin.root);

    return successState("وضعیت درخواست به‌روزرسانی شد.");
  } catch (error) {
    console.error("[admin] request status failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function addRequestNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const parsed = noteSchema.safeParse({
    id: formData.get("id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const updated = await addRequestNote(parsed.data.id, {
      authorId: gate.session.sub,
      authorName: gate.session.name,
      body: parsed.data.body,
    });
    if (!updated) return errorState("درخواست مورد نظر یافت نشد.");

    revalidatePath(ROUTES.admin.request(parsed.data.id));
    return successState("یادداشت داخلی ثبت شد.");
  } catch (error) {
    console.error("[admin] request note failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

export async function updateAppointmentStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const parsed = statusChangeSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  const status = appointmentStatusEnum.safeParse(parsed.data.status);
  if (!status.success) return errorState("وضعیت انتخاب‌شده معتبر نیست.");

  try {
    const updated = await setAppointmentStatus(parsed.data.id, status.data, {
      note: parsed.data.note,
      byName: gate.session.name,
    });
    if (!updated) return errorState("رزرو مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "status",
      entity: "appointment",
      entityId: updated.id,
      entityLabel: updated.bookingCode,
      detail: status.data,
    });

    revalidatePath(ROUTES.admin.appointments);
    revalidatePath(ROUTES.admin.appointment(parsed.data.id));
    revalidatePath(ROUTES.admin.appointmentCalendar);
    revalidatePath(ROUTES.admin.root);

    return successState("وضعیت رزرو به‌روزرسانی شد.");
  } catch (error) {
    console.error("[admin] appointment status failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function rescheduleAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const parsed = rescheduleSchema.safeParse({
    id: formData.get("id"),
    date: formData.get("date"),
    time: formData.get("time"),
  });
  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const updated = await rescheduleAppointment(
      parsed.data.id,
      parsed.data.date,
      parsed.data.time,
      gate.session.name,
    );
    if (!updated) return errorState("رزرو مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "update",
      entity: "appointment",
      entityId: updated.id,
      entityLabel: updated.bookingCode,
      detail: `زمان‌بندی مجدد به ${parsed.data.date} ساعت ${parsed.data.time}`,
    });

    revalidatePath(ROUTES.admin.appointments);
    revalidatePath(ROUTES.admin.appointment(parsed.data.id));
    revalidatePath(ROUTES.admin.appointmentCalendar);

    return successState("زمان جلسه تغییر کرد.");
  } catch (error) {
    console.error("[admin] reschedule failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function addAppointmentNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const parsed = noteSchema.safeParse({
    id: formData.get("id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const updated = await addAppointmentNote(parsed.data.id, {
      authorId: gate.session.sub,
      authorName: gate.session.name,
      body: parsed.data.body,
    });
    if (!updated) return errorState("رزرو مورد نظر یافت نشد.");

    revalidatePath(ROUTES.admin.appointment(parsed.data.id));
    return successState("یادداشت داخلی ثبت شد.");
  } catch (error) {
    console.error("[admin] appointment note failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Contact messages                                                          */
/* -------------------------------------------------------------------------- */

const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "new",
  "in-progress",
  "completed",
  "rejected",
  "archived",
];

export async function updateMessageStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  const status = text(formData, "status") as SubmissionStatus;

  if (!id || !SUBMISSION_STATUSES.includes(status)) {
    return errorState(MESSAGES.invalid);
  }

  try {
    const updated = await setMessageStatus(id, status);
    if (!updated) return errorState("پیام مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "status",
      entity: "message",
      entityId: id,
      entityLabel: updated.subject,
      detail: status,
    });

    revalidatePath(ROUTES.admin.messages);
    revalidatePath(ROUTES.admin.root);
    return successState("وضعیت پیام به‌روزرسانی شد.");
  } catch (error) {
    console.error("[admin] message status failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function addMessageNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const parsed = noteSchema.safeParse({
    id: formData.get("id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const updated = await addMessageNote(parsed.data.id, {
      authorId: gate.session.sub,
      authorName: gate.session.name,
      body: parsed.data.body,
    });
    if (!updated) return errorState("پیام مورد نظر یافت نشد.");

    revalidatePath(ROUTES.admin.messages);
    return successState("یادداشت داخلی ثبت شد.");
  } catch (error) {
    console.error("[admin] message note failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteMessageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const message = await getMessageById(id);
    const removed = await deleteMessage(id);
    if (!removed) return errorState("پیام مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "message",
      entityId: id,
      entityLabel: message?.subject ?? "پیام تماس",
    });

    revalidatePath(ROUTES.admin.messages);
    return successState("پیام حذف شد.");
  } catch (error) {
    console.error("[admin] delete message failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "users");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");

  const parsed = adminUserFormSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    status: formData.get("status"),
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  const input = parsed.data;

  /**
   * A new account has no password to fall back on, so one is required. On an
   * edit an empty field means "leave the current password alone", which is
   * what an administrator fixing a typo in a name expects.
   */
  if (!id && !input.password) {
    return errorState(MESSAGES.validation, {
      password: ["برای کاربر جدید، تعیین رمز عبور الزامی است."],
    });
  }

  try {
    const duplicate = await findUserByEmail(input.email);
    if (duplicate && duplicate.id !== id) {
      return errorState(MESSAGES.validation, {
        email: ["کاربر دیگری با این ایمیل ثبت شده است."],
      });
    }

    if (id) {
      const current = await getUserById(id);
      if (!current) return errorState("کاربر مورد نظر یافت نشد.");

      /**
       * Locking yourself out is a one-way door on a self-hosted panel, so an
       * administrator may not strip their own privileges or suspend their own
       * account. Another administrator can still do either.
       */
      if (id === gate.session.sub) {
        if (input.role !== current.role) {
          return errorState("تغییر نقش حساب کاربری خودتان ممکن نیست.");
        }
        if (input.status !== "active") {
          return errorState("غیرفعال کردن حساب کاربری خودتان ممکن نیست.");
        }
      }

      const updated = await updateUser(id, {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: input.status,
        ...(input.password
          ? { passwordHash: await hashPassword(input.password) }
          : {}),
      });
      if (!updated) return errorState("کاربر مورد نظر یافت نشد.");

      await audit(gate.session, {
        action: "update",
        entity: "user",
        entityId: id,
        entityLabel: updated.fullName,
        detail: input.role !== current.role ? `نقش: ${input.role}` : undefined,
      });
    } else {
      const created = await createUser({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: input.status,
        passwordHash: await hashPassword(input.password),
      });

      await audit(gate.session, {
        action: "create",
        entity: "user",
        entityId: created.id,
        entityLabel: created.fullName,
        detail: `نقش: ${input.role}`,
      });
    }

    revalidatePath(ROUTES.admin.users);
    return successState(id ? "کاربر به‌روزرسانی شد." : "کاربر جدید ساخته شد.");
  } catch (error) {
    console.error("[admin] save user failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function updateUserStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "users");
  if (!gate.ok) return gate.state;

  const parsed = userStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  if (parsed.data.id === gate.session.sub) {
    return errorState("تغییر وضعیت حساب کاربری خودتان ممکن نیست.");
  }

  try {
    const updated = await updateUser(parsed.data.id, {
      status: parsed.data.status,
    });
    if (!updated) return errorState("کاربر مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "status",
      entity: "user",
      entityId: parsed.data.id,
      entityLabel: updated.fullName,
      detail: parsed.data.status,
    });

    revalidatePath(ROUTES.admin.users);
    return successState("وضعیت کاربر به‌روزرسانی شد.");
  } catch (error) {
    console.error("[admin] user status failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "users");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  if (id === gate.session.sub) {
    return errorState("حذف حساب کاربری خودتان ممکن نیست.");
  }

  try {
    const user = await getUserById(id);
    if (!user) return errorState("کاربر مورد نظر یافت نشد.");

    const removed = await deleteUser(id);
    if (!removed) return errorState("کاربر مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "user",
      entityId: id,
      entityLabel: user.fullName,
    });

    revalidatePath(ROUTES.admin.users);
    revalidatePath(ROUTES.admin.root);
    return successState("کاربر حذف شد.");
  } catch (error) {
    console.error("[admin] delete user failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Arbitrators / people                                                      */
/* -------------------------------------------------------------------------- */

export async function saveArbitratorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");

  const parsed = arbitratorFormSchema.safeParse({
    fullName: formData.get("fullName"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    shortBio: formData.get("shortBio"),
    biography: formData.get("biography"),
    photoUrl: formData.get("photoUrl"),
    expertise: lines(formData, "expertise"),
    practiceAreas: lines(formData, "practiceAreas"),
    approach: formData.get("approach") ?? "",
    languages: lines(formData, "languages"),
    memberships: lines(formData, "memberships"),
    education: lines(formData, "education"),
    background: lines(formData, "background"),
    yearsOfExperience: formData.get("yearsOfExperience"),
    email: formData.get("email"),
    order: formData.get("order"),
    bookable: bool(formData, "bookable"),
    published: bool(formData, "published"),
    seo: {
      metaTitle: formData.get("metaTitle"),
      metaDescription: formData.get("metaDescription"),
      ogImage: formData.get("ogImage"),
      noindex: bool(formData, "noindex"),
      nofollow: bool(formData, "nofollow"),
    },
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const existing = await listArbitrators();
    const taken = existing.filter((a) => a.id !== id).map((a) => a.slug);
    const slug = uniqueSlug(parsed.data.slug, taken);

    const payload = {
      ...parsed.data,
      slug,
      education: parseCredentials(lines(formData, "education")),
      background: parseCredentials(lines(formData, "background")),
    };

    if (id) {
      const updated = await updateArbitrator(id, payload);
      if (!updated) return errorState("پروفایل مورد نظر یافت نشد.");

      await audit(gate.session, {
        action: "update",
        entity: "arbitrator",
        entityId: id,
        entityLabel: updated.fullName,
      });
    } else {
      const created = await createArbitrator(payload);
      await audit(gate.session, {
        action: "create",
        entity: "arbitrator",
        entityId: created.id,
        entityLabel: created.fullName,
      });
    }

    revalidatePath(ROUTES.admin.arbitrators);
    revalidatePath(ROUTES.arbitrator);
    revalidatePath(ROUTES.arbitratorProfile(slug));
    revalidatePath("/");

    return successState(
      id ? "اطلاعات پروفایل به‌روزرسانی شد." : "پروفایل جدید ثبت شد.",
    );
  } catch (error) {
    console.error("[admin] save arbitrator failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteArbitratorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const person = await getArbitratorById(id);
    const removed = await deleteArbitrator(id);
    if (!removed) return errorState("پروفایل مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "arbitrator",
      entityId: id,
      entityLabel: person?.fullName ?? "پروفایل",
    });

    revalidatePath(ROUTES.admin.arbitrators);
    revalidatePath(ROUTES.arbitrator);
    return successState("پروفایل حذف شد.");
  } catch (error) {
    console.error("[admin] delete arbitrator failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Services                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");

  const parsed = serviceFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    body: formData.get("body"),
    category: formData.get("category"),
    icon: formData.get("icon"),
    highlights: lines(formData, "highlights"),
    image: formData.get("image"),
    ctaLabel: formData.get("ctaLabel"),
    ctaHref: formData.get("ctaHref"),
    order: formData.get("order"),
    status: formData.get("status"),
    scheduledFor: formData.get("scheduledFor"),
    seo: {
      metaTitle: formData.get("metaTitle"),
      metaDescription: formData.get("metaDescription"),
      canonicalPath: formData.get("canonicalPath"),
      ogTitle: formData.get("ogTitle"),
      ogDescription: formData.get("ogDescription"),
      ogImage: formData.get("ogImage"),
      noindex: bool(formData, "noindex"),
      nofollow: bool(formData, "nofollow"),
    },
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const existing = await listServices();
    const taken = existing.filter((s) => s.id !== id).map((s) => s.slug);
    const slug = uniqueSlug(parsed.data.slug, taken);
    const current = id ? await getServiceById(id) : null;

    const payload = {
      ...parsed.data,
      slug,
      icon: parsed.data.icon as never,
      image: parsed.data.image || undefined,
      ctaLabel: parsed.data.ctaLabel || undefined,
      ctaHref: parsed.data.ctaHref || undefined,
      // Step lists, linked FAQs and related services are edited elsewhere;
      // preserving them here stops this form from wiping them.
      process: current?.process ?? [],
      faqIds: current?.faqIds ?? [],
      relatedSlugs: current?.relatedSlugs ?? [],
      ...resolvePublication(
        {
          status: parsed.data.status,
          scheduledFor: parsed.data.scheduledFor || undefined,
        },
        current ?? undefined,
      ),
    };

    if (id) {
      if (!current) return errorState("خدمت مورد نظر یافت نشد.");

      await recordRevision({
        entity: "service",
        entityId: current.id,
        label: current.title,
        authorId: gate.session.sub,
        authorName: gate.session.name,
        snapshot: current,
      });

      const updated = await updateService(id, payload);
      if (!updated) return errorState("خدمت مورد نظر یافت نشد.");

      await audit(gate.session, {
        action: current.status !== parsed.data.status ? "publish" : "update",
        entity: "service",
        entityId: id,
        entityLabel: updated.title,
      });
    } else {
      const created = await createService(payload);
      await audit(gate.session, {
        action: "create",
        entity: "service",
        entityId: created.id,
        entityLabel: created.title,
      });
    }

    revalidatePath(ROUTES.admin.services);
    revalidatePath(ROUTES.services);
    revalidatePath(ROUTES.service(slug));
    revalidatePath("/");

    return successState(id ? "خدمت به‌روزرسانی شد." : "خدمت جدید ثبت شد.");
  } catch (error) {
    console.error("[admin] save service failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const service = await getServiceById(id);
    const removed = await deleteService(id);
    if (!removed) return errorState("خدمت مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "service",
      entityId: id,
      entityLabel: service?.title ?? "خدمت",
    });

    revalidatePath(ROUTES.admin.services);
    revalidatePath(ROUTES.services);
    return successState("خدمت حذف شد.");
  } catch (error) {
    console.error("[admin] delete service failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Articles                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveArticleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");

  const parsed = articleFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    category: formData.get("category"),
    coverImage: formData.get("coverImage"),
    authorName: formData.get("authorName"),
    tags: formData.get("tags"),
    featured: bool(formData, "featured"),
    status: formData.get("status"),
    scheduledFor: formData.get("scheduledFor"),
    seo: {
      metaTitle: formData.get("metaTitle"),
      metaDescription: formData.get("metaDescription"),
      canonicalPath: formData.get("canonicalPath"),
      ogTitle: formData.get("ogTitle"),
      ogDescription: formData.get("ogDescription"),
      ogImage: formData.get("ogImage"),
      noindex: bool(formData, "noindex"),
      nofollow: bool(formData, "nofollow"),
    },
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    // The category list is editable, so membership is checked against what
    // exists right now rather than against a compile-time enum.
    const categories = await listCategories();
    if (!categories.some((category) => category.slug === parsed.data.category)) {
      return errorState(MESSAGES.validation, {
        category: ["دسته‌بندی انتخاب‌شده معتبر نیست."],
      });
    }

    const { items } = await listArticles({ pageSize: 1000 });
    const taken = items.filter((a) => a.id !== id).map((a) => a.slug);
    const slug = uniqueSlug(parsed.data.slug, taken);
    const current = id ? await getArticleById(id) : null;

    const publication = resolvePublication(
      {
        status: parsed.data.status,
        scheduledFor: parsed.data.scheduledFor || undefined,
      },
      current ?? undefined,
    );

    const payload = {
      ...parsed.data,
      slug,
      readingMinutes: estimateReadingMinutes(toPlainText(parsed.data.body)),
      authorId: current?.authorId,
      /**
       * `publishedAt` is the date readers and search engines were shown, so a
       * later edit must not rewrite it. For a scheduled article it is the
       * moment it will go live.
       */
      publishedAt:
        publication.publishedAt ??
        parsed.data.scheduledFor ??
        new Date().toISOString(),
      ...publication,
    };

    if (id) {
      if (!current) return errorState("مقاله مورد نظر یافت نشد.");

      await recordRevision({
        entity: "article",
        entityId: current.id,
        label: current.title,
        authorId: gate.session.sub,
        authorName: gate.session.name,
        snapshot: current,
      });

      const updated = await updateArticle(id, payload);
      if (!updated) return errorState("مقاله مورد نظر یافت نشد.");

      await audit(gate.session, {
        action:
          current.status !== parsed.data.status
            ? parsed.data.status === "published"
              ? "publish"
              : "unpublish"
            : "update",
        entity: "article",
        entityId: id,
        entityLabel: updated.title,
      });
    } else {
      const created = await createArticle(payload);
      await audit(gate.session, {
        action: "create",
        entity: "article",
        entityId: created.id,
        entityLabel: created.title,
      });
    }

    revalidatePath(ROUTES.admin.articles);
    revalidatePath(ROUTES.articles);
    revalidatePath(ROUTES.article(slug));
    revalidatePath(ROUTES.home);

    return successState(id ? "مقاله به‌روزرسانی شد." : "مقاله جدید ثبت شد.");
  } catch (error) {
    console.error("[admin] save article failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteArticleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const article = await getArticleById(id);
    const removed = await deleteArticle(id);
    if (!removed) return errorState("مقاله مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "article",
      entityId: id,
      entityLabel: article?.title ?? "مقاله",
    });

    revalidatePath(ROUTES.admin.articles);
    revalidatePath(ROUTES.articles);
    return successState("مقاله حذف شد.");
  } catch (error) {
    console.error("[admin] delete article failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveFaqAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");

  const parsed = faqFormSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    topic: formData.get("topic"),
    order: formData.get("order"),
    published: bool(formData, "published"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    if (id) {
      const updated = await updateFaq(id, parsed.data);
      if (!updated) return errorState("پرسش مورد نظر یافت نشد.");
      await audit(gate.session, {
        action: "update",
        entity: "faq",
        entityId: id,
        entityLabel: updated.question,
      });
    } else {
      const created = await createFaq(parsed.data);
      await audit(gate.session, {
        action: "create",
        entity: "faq",
        entityId: created.id,
        entityLabel: created.question,
      });
    }

    revalidatePath(ROUTES.admin.faq);
    revalidatePath(ROUTES.faq);
    revalidatePath(ROUTES.home);

    return successState(id ? "پرسش به‌روزرسانی شد." : "پرسش جدید ثبت شد.");
  } catch (error) {
    console.error("[admin] save faq failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteFaqAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const faq = await getFaqById(id);
    const removed = await deleteFaq(id);
    if (!removed) return errorState("پرسش مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "faq",
      entityId: id,
      entityLabel: faq?.question ?? "پرسش متداول",
    });

    revalidatePath(ROUTES.admin.faq);
    revalidatePath(ROUTES.faq);
    return successState("پرسش حذف شد.");
  } catch (error) {
    console.error("[admin] delete faq failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Site settings                                                             */
/* -------------------------------------------------------------------------- */

export async function saveSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "settings");
  if (!gate.ok) return gate.state;

  const parsed = settingsFormSchema.safeParse({
    institutionName: formData.get("institutionName"),
    institutionShortName: formData.get("institutionShortName"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    faviconUrl: formData.get("faviconUrl"),
    language: formData.get("language"),
    direction: formData.get("direction"),
    phones: lines(formData, "phones"),
    mobile: formData.get("mobile"),
    email: formData.get("email"),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
    registrationNumber: formData.get("registrationNumber") ?? "",
    mapEmbedUrl: formData.get("mapEmbedUrl"),
    mapLat: formData.get("mapLat"),
    mapLng: formData.get("mapLng"),
    notaryEnabled: bool(formData, "notaryEnabled"),
    notaryOfficeName: formData.get("notaryOfficeName") ?? "",
    notaryName: formData.get("notaryName") ?? "",
    notaryPhone: formData.get("notaryPhone") ?? "",
    notaryAddress: formData.get("notaryAddress") ?? "",
    notaryNote: formData.get("notaryNote") ?? "",
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  const workingHours = rows<{ hourLabel: string; hourValue: string }>(formData, [
    "hourLabel",
    "hourValue",
  ])
    .map((row) => ({
      label: row.hourLabel.trim(),
      value: row.hourValue.trim(),
    }))
    .filter((entry) => entry.label && entry.value)
    .slice(0, 8);

  const socials = readSocialLinks(formData);

  const {
    notaryEnabled,
    notaryOfficeName,
    notaryName,
    notaryPhone,
    notaryAddress,
    notaryNote,
    logoUrl,
    faviconUrl,
    ...institution
  } = parsed.data;

  /**
   * The notary office is stored as its own entity, never spread into the
   * institution's fields. It only goes live when it is both switched on and
   * actually filled in, so a half-completed record cannot leak onto the site.
   */
  const notaryOffice = {
    enabled: notaryEnabled && Boolean(notaryOfficeName.trim() && notaryName.trim()),
    officeName: notaryOfficeName.trim(),
    notaryName: notaryName.trim(),
    phone: notaryPhone.trim(),
    address: notaryAddress.trim(),
    note: notaryNote.trim(),
  };

  try {
    await updateSettings({
      ...institution,
      logoUrl: logoUrl || undefined,
      faviconUrl: faviconUrl || undefined,
      ...(workingHours.length ? { workingHours } : {}),
      socials,
      notaryOffice,
    });

    await audit(gate.session, {
      action: "update",
      entity: "settings",
      entityLabel: "تنظیمات عمومی سایت",
    });

    // Settings feed the header and footer on every page.
    revalidatePath("/", "layout");

    return successState("تنظیمات سایت ذخیره شد.");
  } catch (error) {
    console.error("[admin] save settings failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Navigation helper                                                         */
/* -------------------------------------------------------------------------- */

/** Used by "save and return to list" buttons. */
export async function redirectToAction(path: string): Promise<void> {
  if (!path.startsWith("/admin")) redirect(ROUTES.admin.root);
  redirect(path as Route);
}
