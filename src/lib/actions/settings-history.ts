"use server";

import { revalidatePath } from "next/cache";
import type {
  AppointmentSettings,
  BrandingSettings,
  CustomCodeSettings,
  FooterSettings,
  HeaderSettings,
  SeoSettings,
  SiteSettings,
} from "@/types";
import {
  getRevision,
  getSettings,
  recordRevision,
  updateAppointmentSettings,
  updateBrandingSettings,
  updateCustomCodeSettings,
  updateFooterSettings,
  updateHeaderSettings,
  updateSeoSettings,
  updateSettings,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  SETTINGS_GROUP_LABEL,
  isSettingsGroup,
  type SettingsGroup,
} from "@/lib/cms/settings-groups";
import { audit, guard, MESSAGES, text } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Restoring a previous version of a configuration group.
 *
 * Settings are the one part of the CMS with no draft step: a save is live on
 * every page the moment it lands, which makes version history the only way
 * back from a change that turned out to be wrong. The current values are
 * snapshotted before the restore, so an accidental rollback is itself
 * reversible.
 */

/** Restoring the advanced group can change what runs on every page. */
const GROUP_PERMISSION = (group: SettingsGroup) =>
  group === "customCode" ? ("advanced" as const) : ("settings" as const);

async function applyGroup(
  group: SettingsGroup,
  snapshot: unknown,
): Promise<void> {
  switch (group) {
    case "header":
      await updateHeaderSettings(snapshot as HeaderSettings);
      return;
    case "footer":
      await updateFooterSettings(snapshot as FooterSettings);
      return;
    case "branding":
      await updateBrandingSettings(snapshot as BrandingSettings);
      return;
    case "seo":
      await updateSeoSettings(snapshot as SeoSettings);
      return;
    case "customCode":
      await updateCustomCodeSettings(snapshot as CustomCodeSettings);
      return;
    case "appointments":
      await updateAppointmentSettings(snapshot as AppointmentSettings);
      return;
    case "general":
    default:
      // The general group is a slice of the settings record rather than a
      // nested object, so it is spread back rather than assigned.
      await updateSettings(
        snapshot as Partial<Omit<SiteSettings, "id" | "createdAt">>,
      );
  }
}

export async function restoreSettingsRevisionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const revisionId = text(formData, "revisionId");
  if (!revisionId) return errorState(MESSAGES.invalid);

  /**
   * The capability is decided by the group the revision belongs to, so the
   * revision has to be read before the gate — hence the session check below
   * rather than a single `guard()` at the top.
   */
  const revision = await getRevision(revisionId);
  if (!revision || revision.entity !== "settings") {
    return errorState("نسخه مورد نظر یافت نشد.");
  }

  if (!isSettingsGroup(revision.entityId)) {
    return errorState("این نسخه به بخشی از تنظیمات مربوط نیست.");
  }

  const group = revision.entityId;
  const gate = await guard(formData, GROUP_PERMISSION(group));
  if (!gate.ok) return gate.state;

  try {
    // Snapshot the current values first, so the restore can itself be undone.
    const settings = await getSettings();
    await recordRevision({
      entity: "settings",
      entityId: group,
      label: SETTINGS_GROUP_LABEL[group],
      authorId: gate.session.sub,
      authorName: gate.session.name,
      snapshot: group === "general" ? settings : settings[group],
      note: "پیش از بازگردانی نسخه قبلی",
    });

    await applyGroup(group, revision.snapshot);

    await audit(gate.session, {
      action: "restore",
      entity: "settings",
      entityId: group,
      entityLabel: SETTINGS_GROUP_LABEL[group],
      detail: `بازگردانی نسخه ${revision.at}`,
    });

    // Configuration renders on every page.
    revalidatePath("/", "layout");
    revalidatePath(ROUTES.admin.settingsHistory);
    if (group === "seo") {
      revalidatePath("/sitemap.xml");
      revalidatePath("/robots.txt");
    }

    return successState(
      `«${SETTINGS_GROUP_LABEL[group]}» به نسخه انتخاب‌شده بازگردانده شد.`,
    );
  } catch (error) {
    console.error("[cms] restore settings revision failed", error);
    return errorState(MESSAGES.generic);
  }
}
