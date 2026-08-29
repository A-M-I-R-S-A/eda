"use server";

import { revalidatePath } from "next/cache";
import {
  createCategory,
  createTestimonial,
  deleteCategory,
  deleteNewsletterSubscriber,
  deleteTestimonial,
  getCategoryById,
  getTestimonialById,
  listCategories,
  reorderArbitrators,
  reorderCategories,
  reorderFaqs,
  reorderTestimonials,
  setNewsletterStatus,
  updateCategory,
  updateTestimonial,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { uniqueSlug } from "@/lib/utils/slug";
import {
  categoryFormSchema,
  reorderSchema,
  testimonialFormSchema,
} from "@/lib/validation/cms";
import { toFieldErrors } from "@/lib/validation/schemas";
import type { NewsletterStatus } from "@/types";
import { audit, bool, guard, MESSAGES, text } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Categories, testimonials, list ordering and the newsletter roster.
 *
 * Reordering is one action per collection rather than one generic action with
 * a collection name, so each keeps its own capability check and its own
 * revalidation targets — a generic version would have to trust a string from
 * the client to decide what it is allowed to touch.
 */

/* ========================================================================== */
/*  Categories                                                                */
/* ========================================================================== */

export async function saveCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");

  const parsed = categoryFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    order: formData.get("order"),
    published: bool(formData, "published"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const existing = await listCategories();
    const taken = existing
      .filter((category) => category.id !== id)
      .map((category) => category.slug);
    const slug = uniqueSlug(parsed.data.slug, taken);

    const payload = {
      ...parsed.data,
      slug,
      imageUrl: parsed.data.imageUrl || undefined,
    };

    if (id) {
      const updated = await updateCategory(id, payload);
      if (!updated) return errorState("دسته‌بندی مورد نظر یافت نشد.");

      await audit(gate.session, {
        action: "update",
        entity: "category",
        entityId: id,
        entityLabel: updated.title,
      });
    } else {
      const created = await createCategory(payload);
      await audit(gate.session, {
        action: "create",
        entity: "category",
        entityId: created.id,
        entityLabel: created.title,
      });
    }

    revalidatePath(ROUTES.admin.categories);
    revalidatePath(ROUTES.articles);
    return successState(
      id ? "دسته‌بندی به‌روزرسانی شد." : "دسته‌بندی جدید ثبت شد.",
    );
  } catch (error) {
    console.error("[cms] save category failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const category = await getCategoryById(id);
    if (!category) return errorState("دسته‌بندی مورد نظر یافت نشد.");

    const result = await deleteCategory(id);

    if (!result.ok) {
      // Orphaning articles silently is worse than refusing; say how many are
      // in the way so the administrator knows exactly what to reassign.
      return errorState(
        result.inUse > 0
          ? `${result.inUse} مقاله در این دسته‌بندی قرار دارد. ابتدا دسته‌بندی آن‌ها را تغییر دهید.`
          : "دسته‌بندی مورد نظر یافت نشد.",
      );
    }

    await audit(gate.session, {
      action: "delete",
      entity: "category",
      entityId: id,
      entityLabel: category.title,
    });

    revalidatePath(ROUTES.admin.categories);
    revalidatePath(ROUTES.articles);
    return successState("دسته‌بندی حذف شد.");
  } catch (error) {
    console.error("[cms] delete category failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* ========================================================================== */
/*  Testimonials                                                              */
/* ========================================================================== */

export async function saveTestimonialAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");

  const parsed = testimonialFormSchema.safeParse({
    authorName: formData.get("authorName"),
    authorTitle: formData.get("authorTitle"),
    photoUrl: formData.get("photoUrl"),
    quote: formData.get("quote"),
    rating: formData.get("rating"),
    order: formData.get("order"),
    published: bool(formData, "published"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  const payload = {
    ...parsed.data,
    photoUrl: parsed.data.photoUrl || undefined,
  };

  try {
    if (id) {
      const updated = await updateTestimonial(id, payload);
      if (!updated) return errorState("نظر مورد نظر یافت نشد.");
      await audit(gate.session, {
        action: "update",
        entity: "testimonial",
        entityId: id,
        entityLabel: updated.authorName,
      });
    } else {
      const created = await createTestimonial(payload);
      await audit(gate.session, {
        action: "create",
        entity: "testimonial",
        entityId: created.id,
        entityLabel: created.authorName,
      });
    }

    revalidatePath(ROUTES.admin.testimonials);
    revalidatePath("/", "layout");
    return successState(id ? "نظر به‌روزرسانی شد." : "نظر جدید ثبت شد.");
  } catch (error) {
    console.error("[cms] save testimonial failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteTestimonialAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const testimonial = await getTestimonialById(id);
    if (!testimonial) return errorState("نظر مورد نظر یافت نشد.");

    await deleteTestimonial(id);

    await audit(gate.session, {
      action: "delete",
      entity: "testimonial",
      entityId: id,
      entityLabel: testimonial.authorName,
    });

    revalidatePath(ROUTES.admin.testimonials);
    revalidatePath("/", "layout");
    return successState("نظر حذف شد.");
  } catch (error) {
    console.error("[cms] delete testimonial failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* ========================================================================== */
/*  Reordering                                                                */
/* ========================================================================== */

type Reorderer = (ids: string[]) => Promise<void>;

async function handleReorder(
  formData: FormData,
  options: {
    apply: Reorderer;
    entity: Parameters<typeof audit>[1]["entity"];
    label: string;
    paths: string[];
  },
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const parsed = reorderSchema.safeParse({ ids: formData.get("ids") });
  if (!parsed.success) return errorState(MESSAGES.invalid);

  try {
    await options.apply(parsed.data.ids);

    await audit(gate.session, {
      action: "reorder",
      entity: options.entity,
      entityLabel: options.label,
    });

    for (const path of options.paths) revalidatePath(path);
    return successState("ترتیب جدید ذخیره شد.");
  } catch (error) {
    console.error("[cms] reorder failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function reorderFaqsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return handleReorder(formData, {
    apply: reorderFaqs,
    entity: "faq",
    label: "ترتیب پرسش‌ها",
    paths: [ROUTES.admin.faq, ROUTES.faq, "/"],
  });
}

export async function reorderCategoriesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return handleReorder(formData, {
    apply: reorderCategories,
    entity: "category",
    label: "ترتیب دسته‌بندی‌ها",
    paths: [ROUTES.admin.categories, ROUTES.articles],
  });
}

export async function reorderTestimonialsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return handleReorder(formData, {
    apply: reorderTestimonials,
    entity: "testimonial",
    label: "ترتیب نظرات",
    paths: [ROUTES.admin.testimonials, "/"],
  });
}

export async function reorderArbitratorsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return handleReorder(formData, {
    apply: reorderArbitrators,
    entity: "arbitrator",
    label: "ترتیب داوران",
    paths: [ROUTES.admin.arbitrators, ROUTES.arbitrator, "/"],
  });
}

/* ========================================================================== */
/*  Newsletter                                                                */
/* ========================================================================== */

const NEWSLETTER_STATUSES: NewsletterStatus[] = [
  "new",
  "confirmed",
  "unsubscribed",
];

export async function updateNewsletterStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  const status = text(formData, "status") as NewsletterStatus;

  if (!id || !NEWSLETTER_STATUSES.includes(status)) {
    return errorState(MESSAGES.invalid);
  }

  try {
    const updated = await setNewsletterStatus(id, status);
    if (!updated) return errorState("مشترک مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "status",
      entity: "newsletter",
      entityId: id,
      entityLabel: updated.email,
    });

    revalidatePath(ROUTES.admin.newsletter);
    return successState("وضعیت مشترک به‌روزرسانی شد.");
  } catch (error) {
    console.error("[cms] newsletter status failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deleteNewsletterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "operations");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const removed = await deleteNewsletterSubscriber(id);
    if (!removed) return errorState("مشترک مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "newsletter",
      entityId: id,
      entityLabel: "مشترک خبرنامه",
    });

    revalidatePath(ROUTES.admin.newsletter);
    return successState("مشترک حذف شد.");
  } catch (error) {
    console.error("[cms] delete newsletter failed", error);
    return errorState(MESSAGES.generic);
  }
}
