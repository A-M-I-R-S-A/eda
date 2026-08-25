"use server";

import { revalidatePath } from "next/cache";
import type { Article, Service } from "@/types";
import {
  getArticleById,
  getRevision,
  getServiceById,
  recordRevision,
  updateArticle,
  updateService,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { audit, guard, MESSAGES, text } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Restoring a previous version of an article or a service.
 *
 * Two things every restore does, and the reason they matter:
 *
 *  • The *current* state is snapshotted first, so restoring is itself
 *    undoable. An administrator who restores the wrong version is one click
 *    from where they were rather than having overwritten their work.
 *
 *  • Identity fields — id, slug, creation date — are never taken from the
 *    snapshot. Restoring content should not silently move the page's URL out
 *    from under every link pointing at it.
 */

export async function restoreArticleRevisionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const revisionId = text(formData, "revisionId");
  if (!revisionId) return errorState(MESSAGES.invalid);

  try {
    const revision = await getRevision(revisionId);
    if (!revision || revision.entity !== "article") {
      return errorState("نسخه مورد نظر یافت نشد.");
    }

    const current = await getArticleById(revision.entityId);
    if (!current) return errorState("مقاله مورد نظر یافت نشد.");

    const snapshot = revision.snapshot as Article;

    await recordRevision({
      entity: "article",
      entityId: current.id,
      label: current.title,
      authorId: gate.session.sub,
      authorName: gate.session.name,
      snapshot: current,
      note: "پیش از بازگردانی نسخه قبلی",
    });

    const updated = await updateArticle(current.id, {
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      body: snapshot.body,
      category: snapshot.category,
      coverImage: snapshot.coverImage,
      authorName: snapshot.authorName,
      tags: snapshot.tags,
      featured: snapshot.featured,
      readingMinutes: snapshot.readingMinutes,
      status: snapshot.status,
      scheduledFor: snapshot.scheduledFor,
      seo: snapshot.seo,
    });

    if (!updated) return errorState("بازگردانی انجام نشد.");

    await audit(gate.session, {
      action: "restore",
      entity: "article",
      entityId: current.id,
      entityLabel: current.title,
      detail: `بازگردانی نسخه ${revision.at}`,
    });

    revalidatePath(ROUTES.admin.articles);
    revalidatePath(ROUTES.admin.articleEdit(current.id));
    revalidatePath(ROUTES.article(updated.slug));
    revalidatePath(ROUTES.articles);

    return successState("نسخه انتخاب‌شده بازگردانی شد.");
  } catch (error) {
    console.error("[cms] restore article revision failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function restoreServiceRevisionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const revisionId = text(formData, "revisionId");
  if (!revisionId) return errorState(MESSAGES.invalid);

  try {
    const revision = await getRevision(revisionId);
    if (!revision || revision.entity !== "service") {
      return errorState("نسخه مورد نظر یافت نشد.");
    }

    const current = await getServiceById(revision.entityId);
    if (!current) return errorState("خدمت مورد نظر یافت نشد.");

    const snapshot = revision.snapshot as Service;

    await recordRevision({
      entity: "service",
      entityId: current.id,
      label: current.title,
      authorId: gate.session.sub,
      authorName: gate.session.name,
      snapshot: current,
      note: "پیش از بازگردانی نسخه قبلی",
    });

    const updated = await updateService(current.id, {
      title: snapshot.title,
      shortDescription: snapshot.shortDescription,
      body: snapshot.body,
      category: snapshot.category,
      icon: snapshot.icon,
      highlights: snapshot.highlights,
      process: snapshot.process,
      faqIds: snapshot.faqIds,
      relatedSlugs: snapshot.relatedSlugs,
      image: snapshot.image,
      ctaLabel: snapshot.ctaLabel,
      ctaHref: snapshot.ctaHref,
      status: snapshot.status,
      scheduledFor: snapshot.scheduledFor,
      seo: snapshot.seo,
    });

    if (!updated) return errorState("بازگردانی انجام نشد.");

    await audit(gate.session, {
      action: "restore",
      entity: "service",
      entityId: current.id,
      entityLabel: current.title,
      detail: `بازگردانی نسخه ${revision.at}`,
    });

    revalidatePath(ROUTES.admin.services);
    revalidatePath(ROUTES.admin.serviceEdit(current.id));
    revalidatePath(ROUTES.service(updated.slug));
    revalidatePath(ROUTES.services);

    return successState("نسخه انتخاب‌شده بازگردانی شد.");
  } catch (error) {
    console.error("[cms] restore service revision failed", error);
    return errorState(MESSAGES.generic);
  }
}
