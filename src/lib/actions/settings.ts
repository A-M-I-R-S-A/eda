"use server";

import { revalidatePath } from "next/cache";
import type {
  AppointmentTypeConfig,
  FooterColumn,
  NavLink,
  WorkingDayConfig,
} from "@/types";
import {
  getSettings,
  recordRevision,
  updateAppointmentSettings,
  updateBrandingSettings,
  updateCustomCodeSettings,
  updateFooterSettings,
  updateHeaderSettings,
  updateSeoSettings,
  updateSmsSettings,
} from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import type { SettingsGroup } from "@/lib/cms/settings-groups";
import { newId } from "@/lib/utils/id";
import { slugify } from "@/lib/utils/slug";
import {
  advancedFormSchema,
  appointmentSettingsFormSchema,
  appointmentTypeSchema,
  blockedDateSchema,
  brandingFormSchema,
  footerFormSchema,
  headerFormSchema,
  hrefSchema,
  seoSettingsFormSchema,
  smsSettingsFormSchema,
  workingDaySchema,
} from "@/lib/validation/cms";
import { toFieldErrors } from "@/lib/validation/schemas";
import { audit, bool, guard, MESSAGES, rows, text } from "./guard";
import { errorState, successState, type FormState } from "./types";

/**
 * Configuration actions: header, footer, branding, SEO defaults, advanced
 * code and appointment rules.
 *
 * Every one of these renders on *every* page, so each finishes with
 * `revalidatePath("/", "layout")` — anything less leaves a stale header on
 * cached routes, which reads as a save that silently did nothing.
 */

const revalidateSite = () => revalidatePath("/", "layout");

/**
 * Snapshots a configuration group before it is overwritten.
 *
 * Settings have no "draft" step — a save is live immediately on every page —
 * so version history is the only way back from a change that turned out to be
 * wrong. Each group is versioned under its own key, so restoring the footer
 * cannot disturb the header.
 */
async function snapshotGroup(
  session: { sub: string; name: string },
  group: SettingsGroup,
  label: string,
  note?: string,
): Promise<void> {
  const settings = await getSettings();

  const value =
    group === "general"
      ? {
          institutionName: settings.institutionName,
          institutionShortName: settings.institutionShortName,
          tagline: settings.tagline,
          description: settings.description,
          logoUrl: settings.logoUrl,
          faviconUrl: settings.faviconUrl,
          language: settings.language,
          direction: settings.direction,
          phones: settings.phones,
          mobile: settings.mobile,
          email: settings.email,
          address: settings.address,
          postalCode: settings.postalCode,
          registrationNumber: settings.registrationNumber,
          mapEmbedUrl: settings.mapEmbedUrl,
          mapLat: settings.mapLat,
          mapLng: settings.mapLng,
          workingHours: settings.workingHours,
          socials: settings.socials,
          notaryOffice: settings.notaryOffice,
        }
      : group === "sms"
        ? /**
           * The provider key is deliberately not snapshotted.
           *
           * Version history is readable by anyone with the `settings`
           * capability and renders each snapshot verbatim, while the SMS
           * screen itself is behind `advanced` precisely so that the account
           * key is not readable there. Keeping the key out of the snapshot is
           * what stops history from being the way around that gate — and it
           * means a restore cannot silently reinstate a key that was replaced.
           */
          { ...settings.sms, apiKey: "" }
        : settings[group];

  await recordRevision({
    entity: "settings",
    entityId: group,
    label,
    authorId: session.sub,
    authorName: session.name,
    snapshot: value,
    note,
  });
}

/* -------------------------------------------------------------------------- */
/*  Navigation rows                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Rebuilds a navigation list from its repeating inputs.
 *
 * Rows with no label are dropped rather than rejected: an administrator who
 * clicks "add" and then changes their mind should not be blocked from saving
 * by an empty row they never filled in.
 */
function readNavLinks(formData: FormData, prefix: string): NavLink[] {
  const fields = [
    `${prefix}Id`,
    `${prefix}Label`,
    `${prefix}Href`,
    `${prefix}Description`,
    `${prefix}Visible`,
    `${prefix}External`,
  ];

  const raw = rows<Record<string, string>>(formData, fields);

  return raw
    .map((row, index): NavLink | null => {
      const label = (row[`${prefix}Label`] ?? "").trim();
      const href = (row[`${prefix}Href`] ?? "").trim();
      if (!label) return null;

      const parsedHref = hrefSchema.safeParse(href);

      return {
        id: (row[`${prefix}Id`] ?? "").trim() || newId(),
        label: label.slice(0, 80),
        href: parsedHref.success ? parsedHref.data : "/",
        description: (row[`${prefix}Description`] ?? "").trim().slice(0, 200) || undefined,
        order: index,
        // A checkbox inside a repeating row cannot be read positionally, so
        // the editor posts an explicit "1"/"0" per row instead.
        visible: (row[`${prefix}Visible`] ?? "1") !== "0",
        external: (row[`${prefix}External`] ?? "0") === "1",
      };
    })
    .filter((link): link is NavLink => link !== null)
    .slice(0, 30);
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

export async function saveHeaderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "settings");
  if (!gate.ok) return gate.state;

  const parsed = headerFormSchema.safeParse({
    logoUrl: formData.get("logoUrl"),
    logoHeight: formData.get("logoHeight"),
    showWordmark: bool(formData, "showWordmark"),
    descriptor: formData.get("descriptor"),
    ctaVisible: bool(formData, "ctaVisible"),
    ctaLabel: formData.get("ctaLabel"),
    ctaHref: formData.get("ctaHref"),
    style: formData.get("style"),
    sticky: bool(formData, "sticky"),
    showUtilityBar: bool(formData, "showUtilityBar"),
    showPhone: bool(formData, "showPhone"),
    showHours: bool(formData, "showHours"),
    mobileMenuEnabled: bool(formData, "mobileMenuEnabled"),
    mobileCtaLabel: formData.get("mobileCtaLabel"),
    mobileCtaHref: formData.get("mobileCtaHref"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    await snapshotGroup(gate.session, "header", "تنظیمات هدر");
    await updateHeaderSettings({
      ...parsed.data,
      nav: readNavLinks(formData, "nav"),
      utilityLinks: readNavLinks(formData, "utility"),
      mobileQuickLinks: readNavLinks(formData, "quick"),
    });

    await audit(gate.session, {
      action: "update",
      entity: "header",
      entityLabel: "تنظیمات هدر",
    });

    revalidateSite();
    return successState("تنظیمات هدر ذخیره شد.");
  } catch (error) {
    console.error("[cms] save header failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Footer columns are two nested repeaters — columns, each with links.
 *
 * Flat `FormData` cannot express that, so each column's links are posted as a
 * JSON string on the column row. The values are still rebuilt field by field
 * below rather than trusted wholesale.
 */
function readFooterColumns(formData: FormData): FooterColumn[] {
  const raw = rows<Record<string, string>>(formData, [
    "columnId",
    "columnTitle",
    "columnVisible",
    "columnLinks",
  ]);

  return raw
    .map((row, index): FooterColumn | null => {
      const title = (row.columnTitle ?? "").trim();
      if (!title) return null;

      let links: NavLink[] = [];
      try {
        const parsed = JSON.parse(row.columnLinks || "[]");
        if (Array.isArray(parsed)) {
          links = parsed
            .filter(
              (link): link is Record<string, unknown> =>
                Boolean(link) && typeof link === "object",
            )
            .map((link, linkIndex) => {
              const href = hrefSchema.safeParse(String(link.href ?? ""));
              return {
                id: String(link.id ?? "") || newId(),
                label: String(link.label ?? "").trim().slice(0, 80),
                href: href.success ? href.data : "/",
                order: linkIndex,
                visible: link.visible !== false,
                external: link.external === true,
              } satisfies NavLink;
            })
            .filter((link) => link.label)
            .slice(0, 20);
        }
      } catch {
        // A malformed column keeps its title and simply loses its links,
        // which the administrator can see and fix — better than refusing the
        // whole save.
      }

      return {
        id: (row.columnId ?? "").trim() || newId(),
        title: title.slice(0, 80),
        order: index,
        visible: (row.columnVisible ?? "1") !== "0",
        links,
      };
    })
    .filter((column): column is FooterColumn => column !== null)
    .slice(0, 6);
}

export async function saveFooterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "settings");
  if (!gate.ok) return gate.state;

  const parsed = footerFormSchema.safeParse({
    logoUrl: formData.get("logoUrl"),
    showWordmark: bool(formData, "showWordmark"),
    description: formData.get("description"),
    copyright: formData.get("copyright"),
    showContactBlock: bool(formData, "showContactBlock"),
    showSocials: bool(formData, "showSocials"),
    showAdminLink: bool(formData, "showAdminLink"),
    showNewsletter: bool(formData, "showNewsletter"),
    newsletterTitle: formData.get("newsletterTitle"),
    newsletterDescription: formData.get("newsletterDescription"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    await snapshotGroup(gate.session, "footer", "تنظیمات فوتر");
    await updateFooterSettings({
      ...parsed.data,
      columns: readFooterColumns(formData),
      quickActions: readNavLinks(formData, "action"),
      legalLinks: readNavLinks(formData, "legal"),
    });

    await audit(gate.session, {
      action: "update",
      entity: "footer",
      entityLabel: "تنظیمات فوتر",
    });

    revalidateSite();
    return successState("تنظیمات فوتر ذخیره شد.");
  } catch (error) {
    console.error("[cms] save footer failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Branding                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveBrandingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "settings");
  if (!gate.ok) return gate.state;

  const parsed = brandingFormSchema.safeParse({
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    accentColor: formData.get("accentColor"),
    backgroundColor: formData.get("backgroundColor"),
    surfaceColor: formData.get("surfaceColor"),
    textColor: formData.get("textColor"),
    mutedColor: formData.get("mutedColor"),
    borderColor: formData.get("borderColor"),
    fontFamily: formData.get("fontFamily"),
    baseFontSize: formData.get("baseFontSize"),
    headingScale: formData.get("headingScale"),
    lineHeight: formData.get("lineHeight"),
    cornerRadius: formData.get("cornerRadius"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    await snapshotGroup(gate.session, "branding", "هویت بصری");
    await updateBrandingSettings(parsed.data);

    await audit(gate.session, {
      action: "update",
      entity: "branding",
      entityLabel: "هویت بصری",
    });

    revalidateSite();
    return successState("تنظیمات ظاهری ذخیره شد.");
  } catch (error) {
    console.error("[cms] save branding failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  SEO defaults                                                              */
/* -------------------------------------------------------------------------- */

export async function saveSeoSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "settings");
  if (!gate.ok) return gate.state;

  const parsed = seoSettingsFormSchema.safeParse({
    defaultTitle: formData.get("defaultTitle"),
    titleTemplate: formData.get("titleTemplate"),
    defaultDescription: formData.get("defaultDescription"),
    defaultOgImage: formData.get("defaultOgImage"),
    keywords: formData.get("keywords"),
    indexSite: bool(formData, "indexSite"),
    followLinks: bool(formData, "followLinks"),
    sitemapEnabled: bool(formData, "sitemapEnabled"),
    robotsExtra: formData.get("robotsExtra"),
    twitterHandle: formData.get("twitterHandle"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    await snapshotGroup(gate.session, "seo", "تنظیمات سئو");
    await updateSeoSettings(parsed.data);

    await audit(gate.session, {
      action: "update",
      entity: "seo",
      entityLabel: "تنظیمات سئو",
      detail: parsed.data.indexSite ? undefined : "ایندکس سایت غیرفعال شد",
    });

    revalidateSite();
    revalidatePath("/sitemap.xml");
    revalidatePath("/robots.txt");
    return successState("تنظیمات سئو ذخیره شد.");
  } catch (error) {
    console.error("[cms] save seo failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Advanced                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveAdvancedAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  /**
   * Custom code runs on every page for every visitor, so this screen is
   * restricted to the `advanced` capability — the super administrator alone —
   * rather than to `settings`.
   */
  const gate = await guard(formData, "advanced");
  if (!gate.ok) return gate.state;

  const parsed = advancedFormSchema.safeParse({
    customCss: formData.get("customCss"),
    customJs: formData.get("customJs"),
    headScripts: formData.get("headScripts"),
    bodyScripts: formData.get("bodyScripts"),
    googleAnalyticsId: formData.get("googleAnalyticsId"),
    googleTagManagerId: formData.get("googleTagManagerId"),
    googleSiteVerification: formData.get("googleSiteVerification"),
    bingSiteVerification: formData.get("bingSiteVerification"),
    enamadHtml: formData.get("enamadHtml"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  try {
    await snapshotGroup(
      gate.session,
      "customCode",
      "کدهای سفارشی",
      "پیش از تغییر کدهای سفارشی",
    );
    await updateCustomCodeSettings(parsed.data);

    await audit(gate.session, {
      action: "update",
      entity: "settings",
      entityLabel: "کدها و تنظیمات پیشرفته",
      detail: "کد سفارشی یا اسکریپت‌های سایت تغییر کرد",
    });

    revalidateSite();
    return successState("تنظیمات پیشرفته ذخیره شد.");
  } catch (error) {
    console.error("[cms] save advanced failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

function readWorkingDays(formData: FormData): WorkingDayConfig[] {
  const raw = rows<Record<string, string>>(formData, [
    "dayIndex",
    "dayEnabled",
    "dayStart",
    "dayEnd",
  ]);

  return raw
    .map((row) => {
      const parsed = workingDaySchema.safeParse({
        day: row.dayIndex,
        enabled: row.dayEnabled === "1",
        start: row.dayStart || "09:00",
        end: row.dayEnd || "18:00",
      });
      // An invalid row is stored as closed rather than dropped, so the week
      // always has seven entries and the editor never loses a row.
      return parsed.success
        ? parsed.data
        : {
            day: Number(row.dayIndex) || 0,
            enabled: false,
            start: "09:00",
            end: "18:00",
          };
    })
    .slice(0, 7);
}

function readAppointmentTypes(formData: FormData): AppointmentTypeConfig[] {
  const raw = rows<Record<string, string>>(formData, [
    "typeId",
    "typeValue",
    "typeTitle",
    "typeDescription",
    "typeDuration",
    "typeFee",
    "typeEnabled",
    "typeModes",
  ]);

  return raw
    .map((row, index): AppointmentTypeConfig | null => {
      const title = (row.typeTitle ?? "").trim();
      if (!title) return null;

      const parsed = appointmentTypeSchema.safeParse({
        id: (row.typeId ?? "").trim() || newId(),
        // A blank key is derived from the title so an administrator never has
        // to think about slugs to add a meeting type.
        value: (row.typeValue ?? "").trim() || slugify(title) || `type-${index + 1}`,
        title,
        description: row.typeDescription,
        durationMinutes: row.typeDuration,
        feeLabel: row.typeFee,
        enabled: row.typeEnabled === "1",
      });

      if (!parsed.success) return null;

      const modes = (row.typeModes ?? "")
        .split(",")
        .map((mode) => mode.trim())
        .filter((mode): mode is "in-person" | "online" | "phone" =>
          ["in-person", "online", "phone"].includes(mode),
        );

      return {
        ...parsed.data,
        // A type with no delivery mode could never be booked, so it falls back
        // to in-person rather than silently disappearing from the wizard.
        modes: modes.length ? modes : ["in-person"],
        order: index,
      };
    })
    .filter((type): type is AppointmentTypeConfig => type !== null)
    .slice(0, 12);
}

export async function saveAppointmentSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "settings");
  if (!gate.ok) return gate.state;

  const parsed = appointmentSettingsFormSchema.safeParse({
    enabled: bool(formData, "enabled"),
    slotMinutes: formData.get("slotMinutes"),
    bufferMinutes: formData.get("bufferMinutes"),
    maxPerDay: formData.get("maxPerDay"),
    leadTimeDays: formData.get("leadTimeDays"),
    horizonDays: formData.get("horizonDays"),
    requireApproval: bool(formData, "requireApproval"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  const blockedDates = text(formData, "blockedDates")
    .split(/[\n,،]/)
    .map((date) => date.trim())
    .filter(Boolean)
    .map((date) => blockedDateSchema.safeParse(date))
    .filter((result) => result.success)
    .map((result) => result.data)
    .slice(0, 200);

  try {
    await snapshotGroup(gate.session, "appointments", "تنظیمات نوبت‌دهی");
    await updateAppointmentSettings({
      ...parsed.data,
      days: readWorkingDays(formData),
      types: readAppointmentTypes(formData),
      blockedDates: [...new Set(blockedDates)].sort(),
    });

    await audit(gate.session, {
      action: "update",
      entity: "appointment",
      entityLabel: "تنظیمات نوبت‌دهی",
    });

    revalidatePath(ROUTES.appointment);
    revalidatePath(ROUTES.admin.appointmentSettings);
    return successState("تنظیمات نوبت‌دهی ذخیره شد.");
  } catch (error) {
    console.error("[cms] save appointment settings failed", error);
    return errorState(MESSAGES.generic);
  }
}

/* -------------------------------------------------------------------------- */
/*  SMS                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveSmsSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guard(formData, "advanced");
  if (!gate.ok) return gate.state;

  const parsed = smsSettingsFormSchema.safeParse({
    enabled: bool(formData, "enabled"),
    requirePhoneVerification: bool(formData, "requirePhoneVerification"),
    apiKey: text(formData, "apiKey"),
    clearApiKey: bool(formData, "clearApiKey"),
    lineNumber: text(formData, "lineNumber"),
    otpTemplateId: text(formData, "otpTemplateId"),
    otpCodeParam: text(formData, "otpCodeParam"),
    staffRecipients: text(formData, "staffRecipients"),
    notifyStaffOnAppointment: bool(formData, "notifyStaffOnAppointment"),
    staffTemplateId: text(formData, "staffTemplateId"),
    staffNameParam: text(formData, "staffNameParam"),
    staffCodeParam: text(formData, "staffCodeParam"),
    updateTemplateId: text(formData, "updateTemplateId"),
    updateCodeParam: text(formData, "updateCodeParam"),
  });

  if (!parsed.success) {
    return errorState(MESSAGES.validation, toFieldErrors(parsed.error));
  }

  /**
   * The stored key is never sent to the browser, so the field always arrives
   * empty unless somebody typed a new one. Empty therefore means "leave it
   * alone" — otherwise every save of an unrelated toggle would wipe the
   * account key — and erasing it is an explicit tick of its own.
   */
  const { clearApiKey, ...values } = parsed.data;
  const patch = { ...values };
  if (clearApiKey) {
    patch.apiKey = "";
  } else if (!patch.apiKey) {
    delete (patch as Partial<typeof patch>).apiKey;
  }

  try {
    await snapshotGroup(gate.session, "sms", "تنظیمات پیامک");
    await updateSmsSettings(patch);

    await audit(gate.session, {
      action: "update",
      entity: "settings",
      entityLabel: "تنظیمات پیامک",
      detail: [
        parsed.data.enabled ? "ارسال پیامک فعال" : "ارسال پیامک غیرفعال",
        clearApiKey
          ? "کلید API حذف شد"
          : patch.apiKey
            ? "کلید API تغییر کرد"
            : null,
      ]
        .filter(Boolean)
        .join(" — "),
    });

    revalidateSite();
    return successState("تنظیمات پیامک ذخیره شد.");
  } catch (error) {
    console.error("[settings] sms save failed", error);
    return errorState(MESSAGES.generic);
  }
}
