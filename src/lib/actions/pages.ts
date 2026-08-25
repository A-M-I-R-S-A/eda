"use server";

import { revalidatePath } from "next/cache";
import type {
  Page,
  PageSection,
  SectionBackground,
  SectionData,
  SectionSpacing,
  SectionType,
} from "@/types";
import {
  createPage,
  deletePage,
  getPageById,
  getRevision,
  listPages,
  recordRevision,
  reorderPages,
  savePageSections,
  updatePage,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  buildSectionDefaults,
  getSectionDefinition,
  isSectionType,
} from "@/lib/cms/section-library";
import { toSectionValue } from "@/lib/cms/section-data";
import { resolvePublication } from "@/lib/cms/status";
import { newId } from "@/lib/utils/id";
import { uniqueSlug } from "@/lib/utils/slug";
import { pageFormSchema, reorderSchema } from "@/lib/validation/cms";
import { toFieldErrors } from "@/lib/validation/schemas";
import { audit, bool, guard, MESSAGES, text } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Page and section actions.
 *
 * The section editor posts its *entire* section list on every save rather than
 * patching one section at a time. That is deliberate: reordering, duplicating,
 * hiding and editing all become the same write, so the list an administrator
 * sees and the list that is persisted can never disagree.
 */

/** Every route a page change can be visible on. */
function revalidatePage(page: Pick<Page, "slug">): void {
  revalidatePath(ROUTES.admin.pages);
  revalidatePath(page.slug ? `/${page.slug}` : "/");
  // The header and footer read the page list for their link pickers.
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/*  Section payload parsing                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Reads one section's field values out of the submitted JSON.
 *
 * The editor serialises `data` as JSON because a section can nest repeater
 * rows arbitrarily, which flat `FormData` cannot express. Values are coerced
 * against the section *definition* rather than trusted, so a renamed or
 * removed field cannot smuggle unexpected shapes into storage.
 */
function parseSectionData(type: SectionType, raw: unknown): SectionData {
  const definition = getSectionDefinition(type);
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const data: SectionData = buildSectionDefaults(type);

  for (const field of definition.fields) {
    const value = source[field.name];
    if (value === undefined) continue;

    if (field.kind === "repeater") {
      const rowFields = field.fields ?? [];
      const incoming = Array.isArray(value) ? value : [];
      const cap = field.max ?? 50;

      data[field.name] = incoming.slice(0, cap).map((row) => {
        const rowSource =
          row && typeof row === "object" && !Array.isArray(row)
            ? (row as Record<string, unknown>)
            : {};
        const parsed: SectionData = {};
        for (const rowField of rowFields) {
          parsed[rowField.name] =
            rowField.kind === "toggle"
              ? Boolean(rowSource[rowField.name])
              : toSectionValue(rowSource[rowField.name]) ?? "";
        }
        return parsed;
      });
      continue;
    }

    if (field.kind === "toggle") {
      data[field.name] = Boolean(value);
      continue;
    }

    if (field.kind === "number") {
      const parsed = Number(value);
      data[field.name] = Number.isFinite(parsed) ? parsed : 0;
      continue;
    }

    data[field.name] = toSectionValue(value) ?? "";
  }

  return data;
}

const BACKGROUNDS: SectionBackground[] = ["paper", "muted", "white", "navy"];
const SPACINGS: SectionSpacing[] = ["none", "sm", "md", "lg"];

interface IncomingSection {
  id?: unknown;
  type?: unknown;
  name?: unknown;
  visible?: unknown;
  background?: unknown;
  spacing?: unknown;
  data?: unknown;
}

function parseSections(raw: string): PageSection[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  // A page with hundreds of sections is a runaway client, not a real design.
  if (parsed.length > 60) return null;

  const sections: PageSection[] = [];

  for (const entry of parsed as IncomingSection[]) {
    if (!isSectionType(entry?.type)) continue;
    const type = entry.type;
    const definition = getSectionDefinition(type);

    sections.push({
      id: typeof entry.id === "string" && entry.id ? entry.id : newId(),
      type,
      name:
        typeof entry.name === "string" && entry.name.trim()
          ? entry.name.trim().slice(0, 80)
          : definition.label,
      visible: entry.visible !== false,
      order: sections.length,
      background: BACKGROUNDS.includes(entry.background as SectionBackground)
        ? (entry.background as SectionBackground)
        : (definition.defaultBackground ?? "paper"),
      spacing: SPACINGS.includes(entry.spacing as SectionSpacing)
        ? (entry.spacing as SectionSpacing)
        : (definition.defaultSpacing ?? "md"),
      data: parseSectionData(type, entry.data),
    });
  }

  return sections;
}

/* -------------------------------------------------------------------------- */
/*  Page CRUD                                                                 */
/* -------------------------------------------------------------------------- */

export async function savePageAction(
  _prev: FormState<{ id: string }>,
  formData: FormData,
): Promise<FormState<{ id: string }>> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  const current = id ? await getPageById(id) : null;
  if (id && !current) return errorState("صفحه مورد نظر یافت نشد.");

  const parsed = pageFormSchema.safeParse({
    title: formData.get("title"),
    // A system page keeps its slug; the field is not even rendered for one.
    slug: current?.system ? undefined : formData.get("slug"),
    excerpt: formData.get("excerpt"),
    featuredImage: formData.get("featuredImage"),
    status: formData.get("status"),
    scheduledFor: formData.get("scheduledFor"),
    showInNav: bool(formData, "showInNav"),
    order: formData.get("order"),
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

  const input = parsed.data;

  try {
    const existing = await listPages();
    const taken = existing
      .filter((page) => page.id !== id)
      .map((page) => page.slug);

    const slug = current?.system
      ? current.slug
      : uniqueSlug(input.slug ?? "", taken);

    const publication = resolvePublication(
      { status: input.status, scheduledFor: input.scheduledFor || undefined },
      current ?? undefined,
    );

    const payload = {
      title: input.title,
      slug,
      excerpt: input.excerpt,
      featuredImage: input.featuredImage || undefined,
      showInNav: input.showInNav,
      order: input.order,
      seo: {
        ...input.seo,
        canonicalPath: input.seo.canonicalPath || undefined,
        ogTitle: input.seo.ogTitle || undefined,
        ogDescription: input.seo.ogDescription || undefined,
        ogImage: input.seo.ogImage || undefined,
      },
      ...publication,
    };

    if (current) {
      // Snapshot the state *before* this save, so restoring undoes one edit.
      await recordRevision({
        entity: "page",
        entityId: current.id,
        label: current.title,
        authorId: gate.session.sub,
        authorName: gate.session.name,
        snapshot: current,
      });

      const updated = await updatePage(current.id, payload);
      if (!updated) return errorState("صفحه مورد نظر یافت نشد.");

      await audit(gate.session, {
        action:
          current.status !== input.status
            ? input.status === "published"
              ? "publish"
              : "unpublish"
            : "update",
        entity: "page",
        entityId: current.id,
        entityLabel: updated.title,
      });

      revalidatePage(updated);
      return successState("صفحه به‌روزرسانی شد.", { id: current.id });
    }

    const created = await createPage({
      ...payload,
      sections: [],
      system: false,
    });

    await audit(gate.session, {
      action: "create",
      entity: "page",
      entityId: created.id,
      entityLabel: created.title,
    });

    revalidatePage(created);
    return successState("صفحه جدید ساخته شد.", { id: created.id });
  } catch (error) {
    console.error("[cms] save page failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function deletePageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const page = await getPageById(id);
    if (!page) return errorState("صفحه مورد نظر یافت نشد.");

    if (page.system) {
      return errorState(
        "این صفحه بخشی از ساختار سایت است و حذف نمی‌شود. برای پنهان کردن آن، وضعیت را روی «بایگانی» بگذارید.",
      );
    }

    const removed = await deletePage(id);
    if (!removed) return errorState("صفحه مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "delete",
      entity: "page",
      entityId: id,
      entityLabel: page.title,
    });

    revalidatePage(page);
    return successState("صفحه حذف شد.");
  } catch (error) {
    console.error("[cms] delete page failed", error);
    return errorState(MESSAGES.generic);
  }
}

/** Copies a page, its sections and its SEO into a fresh draft. */
export async function duplicatePageAction(
  _prev: FormState<{ id: string }>,
  formData: FormData,
): Promise<FormState<{ id: string }>> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const source = await getPageById(id);
    if (!source) return errorState("صفحه مورد نظر یافت نشد.");

    const existing = await listPages();
    const slug = uniqueSlug(
      `${source.slug || "home"}-copy`,
      existing.map((page) => page.slug),
    );

    const created = await createPage({
      ...source,
      slug,
      title: `${source.title} (رونوشت)`,
      // A copy always starts as a draft: publishing it is a decision, not a
      // side effect of duplicating.
      status: "draft",
      publishedAt: undefined,
      scheduledFor: undefined,
      system: false,
      systemNote: undefined,
      showInNav: false,
      sections: source.sections.map((section) => ({
        ...section,
        id: newId(),
        data: structuredClone(section.data),
      })),
    });

    await audit(gate.session, {
      action: "create",
      entity: "page",
      entityId: created.id,
      entityLabel: created.title,
      detail: `رونوشت از «${source.title}»`,
    });

    revalidatePath(ROUTES.admin.pages);
    return successState("رونوشت صفحه ساخته شد.", { id: created.id });
  } catch (error) {
    console.error("[cms] duplicate page failed", error);
    return errorState(MESSAGES.generic);
  }
}

export async function reorderPagesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const parsed = reorderSchema.safeParse({ ids: formData.get("ids") });
  if (!parsed.success) return errorState(MESSAGES.invalid);

  try {
    await reorderPages(parsed.data.ids);
    await audit(gate.session, {
      action: "reorder",
      entity: "page",
      entityLabel: "ترتیب صفحات",
    });
    revalidatePath(ROUTES.admin.pages);
    revalidatePath("/", "layout");
    return successState("ترتیب صفحات ذخیره شد.");
  } catch (error) {
    console.error("[cms] reorder pages failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Persists the whole section list.
 *
 * One write covers reorder, add, duplicate, hide, delete and field edits —
 * see the note at the top of this file for why that is the right granularity.
 */
export async function savePageSectionsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  const sections = parseSections(text(formData, "sections"));
  if (!sections) {
    return errorState(
      "ساختار بخش‌ها قابل خواندن نبود. صفحه را تازه‌سازی کرده و دوباره تلاش کنید.",
    );
  }

  try {
    const current = await getPageById(id);
    if (!current) return errorState("صفحه مورد نظر یافت نشد.");

    await recordRevision({
      entity: "page",
      entityId: current.id,
      label: current.title,
      authorId: gate.session.sub,
      authorName: gate.session.name,
      snapshot: current,
      note: "ویرایش بخش‌های صفحه",
    });

    const updated = await savePageSections(id, sections);
    if (!updated) return errorState("صفحه مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "update",
      entity: "section",
      entityId: current.id,
      entityLabel: current.title,
      detail: `${sections.length} بخش ذخیره شد`,
    });

    revalidatePage(updated);
    return successState("بخش‌های صفحه ذخیره شد.");
  } catch (error) {
    console.error("[cms] save sections failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Revisions                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Restores a previous version.
 *
 * The current state is snapshotted first, so restoring is itself undoable —
 * an administrator who restores the wrong version is one click from back
 * where they were.
 */
export async function restorePageRevisionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "content");
  if (!gate.ok) return gate.state;

  const revisionId = text(formData, "revisionId");
  if (!revisionId) return errorState(MESSAGES.invalid);

  try {
    const revision = await getRevision(revisionId);
    if (!revision || revision.entity !== "page") {
      return errorState("نسخه مورد نظر یافت نشد.");
    }

    const current = await getPageById(revision.entityId);
    if (!current) return errorState("صفحه مورد نظر یافت نشد.");

    const snapshot = revision.snapshot as Page;

    await recordRevision({
      entity: "page",
      entityId: current.id,
      label: current.title,
      authorId: gate.session.sub,
      authorName: gate.session.name,
      snapshot: current,
      note: "پیش از بازگردانی نسخه قبلی",
    });

    const updated = await updatePage(current.id, {
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      featuredImage: snapshot.featuredImage,
      sections: snapshot.sections,
      seo: snapshot.seo,
      showInNav: snapshot.showInNav,
      order: snapshot.order,
      status: snapshot.status,
      scheduledFor: snapshot.scheduledFor,
    });

    if (!updated) return errorState("بازگردانی انجام نشد.");

    await audit(gate.session, {
      action: "restore",
      entity: "page",
      entityId: current.id,
      entityLabel: current.title,
      detail: `بازگردانی نسخه ${revision.at}`,
    });

    revalidatePage(updated);
    return successState("نسخه انتخاب‌شده بازگردانی شد.");
  } catch (error) {
    console.error("[cms] restore page revision failed", error);
    return errorState(MESSAGES.generic);
  }
}
