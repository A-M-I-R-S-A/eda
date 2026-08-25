"use server";

import { revalidatePath } from "next/cache";
import {
  deleteMedia,
  findMediaUsage,
  getMediaById,
  updateMedia,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { deleteMediaFile, isStoredMediaName } from "@/lib/media/storage";
import { mediaFormSchema } from "@/lib/validation/cms";
import { toFieldErrors } from "@/lib/validation/schemas";
import { audit, guard, MESSAGES, text } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Media library actions.
 *
 * Uploading happens over a route handler (see `/api/admin/media`) because the
 * picker dialog needs the created record back without a form round-trip.
 * Renaming and deleting are ordinary actions.
 */

export async function renameMediaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "media");
  if (!gate.ok) return gate.state;

  const parsed = mediaFormSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    alt: formData.get("alt"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    const updated = await updateMedia(parsed.data.id, {
      title: parsed.data.title,
      alt: parsed.data.alt,
    });
    if (!updated) return errorState("فایل مورد نظر یافت نشد.");

    await audit(gate.session, {
      action: "update",
      entity: "media",
      entityId: updated.id,
      entityLabel: updated.title,
    });

    revalidatePath(ROUTES.admin.media);
    return successState("اطلاعات فایل ذخیره شد.");
  } catch (error) {
    console.error("[cms] rename media failed", error);
    return errorState(MESSAGES.generic);
  }
}

/**
 * Deletes a library entry and, when we own it, the file behind it.
 *
 * Two guards worth naming:
 *
 *  • **In-use check.** Deleting a file a live page still points at leaves a
 *    broken image. The action refuses and names where it is used, so the
 *    administrator can fix the reference first.
 *
 *  • **Shipped assets.** The brand plates in `public/` are not ours to unlink;
 *    only entries whose filename matches the uploader's pattern are removed
 *    from disk. The rest are de-listed and left alone.
 */
export async function deleteMediaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "media");
  if (!gate.ok) return gate.state;

  const id = text(formData, "id");
  if (!id) return errorState(MESSAGES.invalid);

  try {
    const asset = await getMediaById(id);
    if (!asset) return errorState("فایل مورد نظر یافت نشد.");

    const usage = await findMediaUsage(asset.url);
    if (usage.length > 0 && text(formData, "force") !== "1") {
      const listed = usage.slice(0, 4).join("، ");
      const more =
        usage.length > 4 ? ` و ${usage.length - 4} مورد دیگر` : "";
      return errorState(
        `این فایل هم‌اکنون در ${listed}${more} استفاده می‌شود. ابتدا آن را جایگزین کنید.`,
      );
    }

    const removed = await deleteMedia(id);
    if (!removed) return errorState("فایل مورد نظر یافت نشد.");

    if (isStoredMediaName(removed.fileName)) {
      await deleteMediaFile(removed.fileName);
    }

    await audit(gate.session, {
      action: "delete",
      entity: "media",
      entityId: id,
      entityLabel: removed.title,
      detail: removed.fileName,
    });

    revalidatePath(ROUTES.admin.media);
    return successState("فایل حذف شد.");
  } catch (error) {
    console.error("[cms] delete media failed", error);
    return errorState(MESSAGES.generic);
  }
}
