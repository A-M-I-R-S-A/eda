import { z } from "zod";
import { RESERVED_SLUGS } from "@/lib/config/routes";
import { digitsOnly, normalizeFa, toEnDigits } from "@/lib/utils/persian";

/**
 * Validation for the CMS surfaces.
 *
 * Same principle as `./schemas`: the schema is the contract, it runs on the
 * server inside every action, and every message is Persian because it renders
 * directly under the field that produced it.
 *
 * CMS fields are markedly more permissive than public-form fields — an
 * administrator editing their own site should not be told a heading is "too
 * short" — so these schemas guard *shape and safety*, not editorial taste.
 */

/**
 * An absent form field means "empty", not "invalid".
 *
 * `formData.get()` returns `null` for an input that is not in the DOM, and a
 * bare `z.string()` rejects that — `.optional()` admits `undefined` only. Every
 * collapsed or conditionally-rendered field therefore failed validation on a
 * control the user could not see, and the form refused to save with nothing
 * visibly wrong. The advanced SEO block, collapsed by default on every page,
 * broke saving across pages, articles, services and arbitrators exactly this
 * way.
 *
 * Normalising `null` and `undefined` to `""` at the edge fixes the whole class
 * rather than each field that happens to be hidden today.
 */
const blankIfMissing = (value: unknown) => (value == null ? "" : value);

const trimmed = (max: number) =>
  z.preprocess(
    blankIfMissing,
    z
      .string()
      .transform((value) => normalizeFa(value).trim())
      .pipe(z.string().max(max, `این فیلد نباید بیشتر از ${max} نویسه باشد.`)),
  );

/**
 * A missing required field should say so in Persian, not report a type error.
 *
 * Same reasoning as `trimmed`: `null` from an absent input is "empty", and
 * empty is what the `min(1)` message below is for.
 */
const required = (max: number, label: string) =>
  z.preprocess(
    blankIfMissing,
    z
      .string()
      .transform((value) => normalizeFa(value).trim())
      .pipe(
        z
          .string()
          .min(1, `وارد کردن ${label} الزامی است.`)
          .max(max, `${label} نباید بیشتر از ${max} نویسه باشد.`),
      ),
  );

export const optionalText = (max = 400) => trimmed(max).optional().default("");

/* -------------------------------------------------------------------------- */
/*  Slugs                                                                     */
/* -------------------------------------------------------------------------- */

export const cmsSlugSchema = z.preprocess(
  blankIfMissing,
  z
  .string()
  .transform((value) => toEnDigits(value).trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(2, "نامک باید حداقل ۲ نویسه باشد.")
      .max(90, "نامک نباید بیشتر از ۹۰ نویسه باشد.")
      .regex(
        /^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/,
        "نامک فقط می‌تواند شامل حروف، اعداد و خط تیره باشد.",
      ),
  ),
);

/**
 * A page slug additionally may not collide with a hand-built route.
 *
 * Letting an administrator create `/contact` as a CMS page would produce a
 * page that saves successfully and then never renders, because the file-system
 * route wins. Refusing up front is far kinder than that silent failure.
 */
export const pageSlugSchema = cmsSlugSchema.refine(
  (slug) => !RESERVED_SLUGS.includes(slug),
  "این نشانی توسط بخش دیگری از سایت استفاده می‌شود. نامک دیگری انتخاب کنید.",
);

/* -------------------------------------------------------------------------- */
/*  Shared pieces                                                             */
/* -------------------------------------------------------------------------- */

export const contentStatusEnum = z.enum([
  "draft",
  "published",
  "scheduled",
  "archived",
]);

/**
 * SEO block.
 *
 * Every field is optional: an empty meta title falls back to the entity title
 * and an empty description falls back to the global default, which is better
 * than forcing an administrator to write one before they can save a draft.
 */
export const cmsSeoSchema = z.object({
  metaTitle: trimmed(70).optional().default(""),
  metaDescription: trimmed(200).optional().default(""),
  canonicalPath: trimmed(300).optional().default(""),
  ogTitle: trimmed(90).optional().default(""),
  ogDescription: trimmed(200).optional().default(""),
  ogImage: trimmed(400).optional().default(""),
  noindex: z.coerce.boolean().default(false),
  nofollow: z.coerce.boolean().default(false),
});

/**
 * A link target.
 *
 * Root-relative paths, absolute http(s) URLs, anchors, `tel:` and `mailto:`
 * are all legitimate destinations for a navigation item. Anything else —
 * `javascript:` above all — is rejected, because navigation is administrator
 * input that renders into an `href` on every page of the site.
 */
export const hrefSchema = z.preprocess(
  blankIfMissing,
  z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .max(500, "نشانی بیش از حد طولانی است.")
      .refine(
        (value) =>
          value === "" ||
          value.startsWith("/") ||
          value.startsWith("#") ||
          value.startsWith("https://") ||
          value.startsWith("http://") ||
          value.startsWith("tel:") ||
          value.startsWith("mailto:"),
        "نشانی باید با /، #، https://، tel: یا mailto: شروع شود.",
      ),
  ),
);

/** A media reference: either a library URL or an empty string. */
export const mediaRefSchema = z.preprocess(
  blankIfMissing,
  z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .max(400)
      .refine(
        (value) => value === "" || value.startsWith("/") || value.startsWith("https://"),
        "نشانی فایل معتبر نیست.",
      ),
  ),
);

const hexColorSchema = z.preprocess(
  blankIfMissing,
  z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "کد رنگ باید به قالب #RRGGBB باشد."),
  ),
);

const isoDateTimeSchema = z.preprocess(
  blankIfMissing,
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(40)),
);

/* -------------------------------------------------------------------------- */
/*  Pages                                                                     */
/* -------------------------------------------------------------------------- */

export const pageFormSchema = z
  .object({
    title: required(160, "عنوان صفحه"),
    slug: pageSlugSchema.optional(),
    excerpt: trimmed(400).optional().default(""),
    featuredImage: mediaRefSchema.optional().default(""),
    status: contentStatusEnum.default("draft"),
    scheduledFor: isoDateTimeSchema.optional().default(""),
    showInNav: z.coerce.boolean().default(false),
    order: z.coerce.number().int().min(0).max(999).default(0),
    seo: cmsSeoSchema,
  })
  .refine(
    (data) => data.status !== "scheduled" || Boolean(data.scheduledFor),
    {
      message: "برای انتشار زمان‌بندی‌شده، تاریخ و ساعت انتشار را مشخص کنید.",
      path: ["scheduledFor"],
    },
  );

export type PageFormInput = z.infer<typeof pageFormSchema>;

export const sectionMetaSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: trimmed(80).optional().default(""),
  visible: z.coerce.boolean().default(true),
  background: z.enum(["paper", "muted", "white", "navy"]).default("paper"),
  spacing: z.enum(["none", "sm", "md", "lg"]).default("md"),
});

/* -------------------------------------------------------------------------- */
/*  Media                                                                     */
/* -------------------------------------------------------------------------- */

export const mediaFormSchema = z.object({
  id: z.string().min(1),
  title: required(160, "نام فایل"),
  alt: trimmed(300).optional().default(""),
});

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

export const categoryFormSchema = z.object({
  title: required(80, "نام دسته‌بندی"),
  slug: cmsSlugSchema,
  description: trimmed(400).optional().default(""),
  imageUrl: mediaRefSchema.optional().default(""),
  order: z.coerce.number().int().min(0).max(999).default(0),
  published: z.coerce.boolean().default(true),
});

/* -------------------------------------------------------------------------- */
/*  Testimonials                                                              */
/* -------------------------------------------------------------------------- */

export const testimonialFormSchema = z.object({
  authorName: required(100, "نام"),
  authorTitle: trimmed(120).optional().default(""),
  photoUrl: mediaRefSchema.optional().default(""),
  quote: required(1200, "متن نظر"),
  rating: z.coerce.number().int().min(0).max(5).default(5),
  order: z.coerce.number().int().min(0).max(999).default(0),
  published: z.coerce.boolean().default(true),
});

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                */
/* -------------------------------------------------------------------------- */

export const navLinkSchema = z.object({
  id: z.string().min(1),
  label: required(80, "عنوان پیوند"),
  href: hrefSchema,
  description: trimmed(200).optional().default(""),
  visible: z.coerce.boolean().default(true),
  external: z.coerce.boolean().default(false),
});

export const headerFormSchema = z.object({
  logoUrl: mediaRefSchema.optional().default(""),
  logoHeight: z.coerce.number().int().min(20).max(120).default(40),
  showWordmark: z.coerce.boolean().default(true),
  descriptor: trimmed(120).optional().default(""),
  ctaVisible: z.coerce.boolean().default(true),
  ctaLabel: trimmed(40).optional().default(""),
  ctaHref: hrefSchema.optional().default(""),
  style: z.enum(["classic", "minimal", "bordered"]).default("classic"),
  sticky: z.coerce.boolean().default(true),
  showUtilityBar: z.coerce.boolean().default(true),
  showPhone: z.coerce.boolean().default(true),
  showHours: z.coerce.boolean().default(true),
  mobileMenuEnabled: z.coerce.boolean().default(true),
  mobileCtaLabel: trimmed(40).optional().default(""),
  mobileCtaHref: hrefSchema.optional().default(""),
});

export const footerFormSchema = z.object({
  logoUrl: mediaRefSchema.optional().default(""),
  showWordmark: z.coerce.boolean().default(true),
  description: trimmed(600).optional().default(""),
  copyright: trimmed(300).optional().default(""),
  showContactBlock: z.coerce.boolean().default(true),
  showSocials: z.coerce.boolean().default(true),
  showServiceLinks: z.coerce.boolean().default(true),
  showAdminLink: z.coerce.boolean().default(true),
  showNewsletter: z.coerce.boolean().default(false),
  newsletterTitle: trimmed(80).optional().default(""),
  newsletterDescription: trimmed(300).optional().default(""),
});

/* -------------------------------------------------------------------------- */
/*  Branding                                                                  */
/* -------------------------------------------------------------------------- */

export const brandingFormSchema = z.object({
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  backgroundColor: hexColorSchema,
  surfaceColor: hexColorSchema,
  textColor: hexColorSchema,
  mutedColor: hexColorSchema,
  borderColor: hexColorSchema,
  fontFamily: trimmed(200).optional().default(""),
  baseFontSize: z.coerce.number().min(13).max(20).default(16),
  headingScale: z.coerce.number().min(0.8).max(1.4).default(1),
  lineHeight: z.coerce.number().min(1.4).max(2.4).default(1.9),
  cornerRadius: z.coerce.number().int().min(0).max(24).default(3),
});

/* -------------------------------------------------------------------------- */
/*  SEO defaults                                                              */
/* -------------------------------------------------------------------------- */

export const seoSettingsFormSchema = z.object({
  defaultTitle: required(80, "عنوان پیش‌فرض"),
  titleTemplate: required(120, "الگوی عنوان").refine(
    (value) => value.includes("%s"),
    "الگوی عنوان باید شامل %s باشد؛ این جای عنوان صفحه قرار می‌گیرد.",
  ),
  defaultDescription: required(300, "توضیحات پیش‌فرض"),
  defaultOgImage: mediaRefSchema.optional().default(""),
  keywords: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(/[،,\n]/)
            .map((keyword) => keyword.trim())
            .filter(Boolean)
        : value,
    z.array(z.string().max(60)).max(30, "حداکثر ۳۰ کلیدواژه مجاز است."),
  ),
  indexSite: z.coerce.boolean().default(true),
  followLinks: z.coerce.boolean().default(true),
  sitemapEnabled: z.coerce.boolean().default(true),
  robotsExtra: trimmed(2000).optional().default(""),
  twitterHandle: trimmed(40).optional().default(""),
});

/* -------------------------------------------------------------------------- */
/*  Advanced / custom code                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Custom code is stored verbatim, on purpose.
 *
 * Sanitising an analytics snippet would break it, so the protection here is
 * *authorisation* — only the super administrator can reach this screen — plus
 * a prominent warning in the UI. The one shape check is on the analytics IDs,
 * which are pasted from a dashboard and are easy to mistype.
 */
export const advancedFormSchema = z.object({
  customCss: z.string().max(40000, "کد CSS بیش از حد طولانی است.").default(""),
  customJs: z.string().max(40000, "کد JavaScript بیش از حد طولانی است.").default(""),
  headScripts: z.string().max(20000).default(""),
  bodyScripts: z.string().max(20000).default(""),
  googleAnalyticsId: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => value === "" || /^(G-[A-Z0-9]+|UA-\d+-\d+)$/i.test(value),
      "شناسه گوگل آنالیتیکس باید به قالب G-XXXXXXX باشد.",
    )
    .default(""),
  googleTagManagerId: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => value === "" || /^GTM-[A-Z0-9]+$/i.test(value),
      "شناسه گوگل تگ‌منیجر باید به قالب GTM-XXXXXX باشد.",
    )
    .default(""),
  googleSiteVerification: z.string().trim().max(200).default(""),
  bingSiteVerification: z.string().trim().max(200).default(""),
  enamadHtml: z.string().max(4000).default(""),
});

/* -------------------------------------------------------------------------- */
/*  SMS configuration                                                         */
/* -------------------------------------------------------------------------- */

const IRAN_MOBILE_RE = /^09\d{9}$/;

/**
 * Staff recipients as `name | phone`, one per line.
 *
 * A repeating two-field row would be more "correct" and slower to fill in for
 * a list of three colleagues. A malformed line is rejected rather than
 * silently dropped: a phone number that quietly vanished is how someone stops
 * receiving alerts without noticing.
 */
const staffRecipientsSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return [];

    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = "", phone = ""] = line.split("|").map((part) => part.trim());
        return { name: name.slice(0, 60), phone: digitsOnly(phone) };
      });
  },
  z
    .array(
      z.object({
        name: z.string().max(60).default(""),
        phone: z
          .string()
          .regex(IRAN_MOBILE_RE, "شماره همکار باید یک موبایل معتبر ۰۹… باشد."),
      }),
    )
    .max(10, "حداکثر ۱۰ همکار گیرنده مجاز است."),
);

/** A registered sms.ir template id, or empty to leave that flow disabled. */
const templateIdSchema = z.preprocess(
  (value) => (value == null ? "" : typeof value === "string" ? digitsOnly(value) : value),
  z
    .string()
    .max(20)
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "شناسه قالب باید عددی باشد.",
    )
    .default(""),
);

/**
 * A parameter name as declared in the sms.ir template.
 *
 * Latin letters, digits and underscore only — that is what the provider
 * accepts, and a mismatched name is rejected at send time rather than here.
 */
const paramNameSchema = z
  .string()
  .trim()
  .max(40)
  .refine(
    (value) => value === "" || /^[A-Za-z][A-Za-z0-9_]*$/.test(value),
    "نام پارامتر باید با حرف لاتین شروع شود.",
  )
  .default("");

export const smsSettingsFormSchema = z.object({
  enabled: z.coerce.boolean().default(false),
  requirePhoneVerification: z.coerce.boolean().default(true),

  staffRecipients: staffRecipientsSchema,
  notifyStaffOnRequest: z.coerce.boolean().default(true),
  notifyStaffOnAppointment: z.coerce.boolean().default(true),
  staffTemplateId: templateIdSchema,
  staffNameParam: paramNameSchema,
  staffCodeParam: paramNameSchema,

  updateTemplateId: templateIdSchema,
  updateCodeParam: paramNameSchema,
});

export type SmsSettingsFormInput = z.infer<typeof smsSettingsFormSchema>;

/* -------------------------------------------------------------------------- */
/*  Appointment configuration                                                 */
/* -------------------------------------------------------------------------- */

const timeSchema = z
  .string()
  .transform((value) => toEnDigits(value ?? "").trim())
  .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "ساعت معتبر نیست."));

export const appointmentSettingsFormSchema = z
  .object({
    enabled: z.coerce.boolean().default(true),
    slotMinutes: z.coerce.number().int().min(10).max(240).default(30),
    bufferMinutes: z.coerce.number().int().min(0).max(120).default(0),
    maxPerDay: z.coerce.number().int().min(1).max(50).default(8),
    leadTimeDays: z.coerce.number().int().min(0).max(60).default(1),
    horizonDays: z.coerce.number().int().min(1).max(365).default(45),
    requireApproval: z.coerce.boolean().default(true),
    note: trimmed(600).optional().default(""),
  })
  .refine((data) => data.horizonDays > data.leadTimeDays, {
    message: "بازه رزرو باید بزرگ‌تر از حداقل فاصله زمانی باشد.",
    path: ["horizonDays"],
  });

export const workingDaySchema = z
  .object({
    day: z.coerce.number().int().min(0).max(6),
    enabled: z.coerce.boolean().default(false),
    start: timeSchema,
    end: timeSchema,
  })
  .refine((data) => !data.enabled || data.start < data.end, {
    message: "ساعت پایان باید بعد از ساعت شروع باشد.",
    path: ["end"],
  });

export const appointmentTypeSchema = z.object({
  id: z.string().min(1),
  value: cmsSlugSchema,
  title: required(80, "عنوان نوع جلسه"),
  description: trimmed(400).optional().default(""),
  durationMinutes: z.coerce.number().int().min(10).max(480).default(30),
  feeLabel: trimmed(120).optional().default(""),
  enabled: z.coerce.boolean().default(true),
});

export const blockedDateSchema = z
  .string()
  .transform((value) => toEnDigits(value ?? "").trim())
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ معتبر نیست."));

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

export const adminUserFormSchema = z.object({
  fullName: required(100, "نام و نام خانوادگی"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "وارد کردن ایمیل الزامی است.")
    .email("نشانی ایمیل معتبر نیست.")
    .max(160),
  phone: z.preprocess(
    (value) => (value == null ? "" : typeof value === "string" ? digitsOnly(value) : value),
    z
      .string()
      .max(15)
      .refine(
        (value) => value === "" || /^0\d{9,10}$/.test(value),
        "شماره تماس معتبر نیست.",
      )
      .default(""),
  ),
  role: z.enum(["admin", "editor", "manager"], {
    message: "نقش کاربر را انتخاب کنید.",
  }),
  status: z.enum(["active", "pending", "suspended"]).default("active"),
  /** Empty on edit means "leave the current password alone". */
  password: z
    .string()
    .max(200)
    .refine(
      (value) => value === "" || value.length >= 10,
      "رمز عبور باید حداقل ۱۰ نویسه باشد.",
    )
    .default(""),
});

/* -------------------------------------------------------------------------- */
/*  Newsletter                                                                */
/* -------------------------------------------------------------------------- */

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "وارد کردن ایمیل الزامی است.")
    .email("نشانی ایمیل معتبر نیست.")
    .max(160),
  name: trimmed(100).optional().default(""),
});

/* -------------------------------------------------------------------------- */
/*  Reordering                                                                */
/* -------------------------------------------------------------------------- */

/** A drag-and-drop reorder posts the full id list in its new order. */
export const reorderSchema = z.object({
  ids: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.split(",").map((id) => id.trim()).filter(Boolean)
        : value,
    z.array(z.string().min(1)).min(1, "ترتیب جدید دریافت نشد."),
  ),
});
