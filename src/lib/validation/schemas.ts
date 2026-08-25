import { z } from "zod";
import { digitsOnly, normalizeFa, toEnDigits } from "@/lib/utils/persian";
import { cmsSeoSchema, contentStatusEnum } from "./cms";

export * from "./cms";

/**
 * Validation schemas — the single source of truth for every form.
 *
 * The *same* schema runs on the client (instant feedback) and again on the
 * server inside each action. Client-side validation is a convenience; the
 * server-side pass is the one that protects the data.
 *
 * All messages are Persian because they are rendered directly under fields.
 */

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

const IRAN_MOBILE = /^09\d{9}$/;
const IRAN_PHONE = /^0\d{9,10}$/;

/** Trims, normalises Persian characters and converts Persian digits. */
const faText = (min: number, max: number, label: string) =>
  z
    .string()
    .transform((v) => normalizeFa(toEnDigits(v ?? "")))
    .pipe(
      z
        .string()
        .min(min, `${label} باید حداقل ${min} نویسه باشد.`)
        .max(max, `${label} نباید بیشتر از ${max} نویسه باشد.`),
    );

export const mobileSchema = z.preprocess(
  (v) => (typeof v === "string" ? digitsOnly(v) : v),
  z
    .string()
    .min(1, "وارد کردن شماره موبایل الزامی است.")
    .regex(IRAN_MOBILE, "شماره موبایل معتبر نیست. نمونه صحیح: ۰۹۱۲۳۴۵۶۷۸۹"),
);

export const anyPhoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? digitsOnly(v) : v),
  z
    .string()
    .min(1, "وارد کردن شماره تماس الزامی است.")
    .regex(IRAN_PHONE, "شماره تماس معتبر نیست. نمونه صحیح: ۰۲۱۸۸۱۲۳۴۵۶"),
);

export const optionalEmailSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().email("نشانی ایمیل معتبر نیست.").max(160).optional(),
);

export const emailSchema = z
  .string()
  .min(1, "وارد کردن ایمیل الزامی است.")
  .email("نشانی ایمیل معتبر نیست.")
  .max(160)
  .transform((v) => v.trim().toLowerCase());

const consentSchema = z.preprocess(
  (v) => v === true || v === "true" || v === "on" || v === "1",
  z.literal(true, {
    message: "برای ادامه، پذیرش سیاست حفظ حریم خصوصی الزامی است.",
  }),
);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ انتخاب‌شده معتبر نیست.");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "ساعت انتخاب‌شده معتبر نیست.");

/* -------------------------------------------------------------------------- */
/*  Public forms                                                              */
/* -------------------------------------------------------------------------- */

export const requestTypeEnum = z.enum(
  ["consultation", "arbitration", "mediation", "contract-review", "representation"],
  { message: "نوع درخواست را انتخاب کنید." },
);

export const contactMethodEnum = z.enum(
  ["phone", "whatsapp", "email", "in-person"],
  { message: "روش تماس ترجیحی را انتخاب کنید." },
);

export const callWindowEnum = z.enum(["morning", "afternoon", "evening"], {
  message: "زمان مناسب تماس را انتخاب کنید.",
});

export const consultationSchema = z.object({
  fullName: faText(3, 100, "نام و نام خانوادگی"),
  phone: mobileSchema,
  email: optionalEmailSchema,
  requestType: requestTypeEnum,
  legalArea: z.string().min(1, "حوزه حقوقی را انتخاب کنید.").max(80),
  subject: faText(5, 150, "موضوع درخواست"),
  description: faText(30, 5000, "شرح موضوع"),
  preferredContact: contactMethodEnum,
  preferredWindow: callWindowEnum,
  consent: consentSchema,
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

export const meetingModeEnum = z.enum(["in-person", "online", "phone"], {
  message: "نوع برگزاری جلسه را انتخاب کنید.",
});

export const consultationTypeEnum = z.enum(
  ["initial", "specialised", "arbitration-session", "contract-review"],
  { message: "نوع مشاوره را انتخاب کنید." },
);

export const appointmentSchema = z.object({
  consultationType: consultationTypeEnum,
  arbitratorId: z.string().min(1, "لطفاً داور یا مشاور را انتخاب کنید."),
  date: isoDateSchema,
  time: timeSchema,
  meetingMode: meetingModeEnum,
  fullName: faText(3, 100, "نام و نام خانوادگی"),
  phone: mobileSchema,
  email: optionalEmailSchema,
  subject: faText(5, 300, "موضوع جلسه"),
  consent: consentSchema,
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const contactSchema = z.object({
  fullName: faText(3, 100, "نام و نام خانوادگی"),
  phone: anyPhoneSchema,
  email: optionalEmailSchema,
  subject: faText(3, 150, "موضوع"),
  message: faText(15, 3000, "متن پیام"),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const trackingSchema = z.object({
  code: z
    .string()
    .transform((v) => toEnDigits(v ?? "").trim().toUpperCase())
    .pipe(
      z
        .string()
        .min(1, "وارد کردن کد پیگیری الزامی است.")
        .regex(
          /^(DR|RZ)-[A-Z0-9]{6}$/,
          "قالب کد پیگیری صحیح نیست. نمونه: DR-7K3MQX",
        ),
    ),
  phone: mobileSchema,
});

export type TrackingInput = z.infer<typeof trackingSchema>;

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "وارد کردن رمز عبور الزامی است.").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------------------- */
/*  Admin: content management                                                 */
/* -------------------------------------------------------------------------- */

const slugSchema = z
  .string()
  .min(2, "نامک باید حداقل ۲ نویسه باشد.")
  .max(90)
  .regex(
    /^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/,
    "نامک فقط می‌تواند شامل حروف، اعداد و خط تیره باشد.",
  );

const linesToArray = (value: unknown): string[] =>
  typeof value === "string"
    ? value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : Array.isArray(value)
      ? (value as string[])
      : [];

export const articleFormSchema = z
  .object({
    title: faText(8, 160, "عنوان مقاله"),
    slug: slugSchema,
    excerpt: faText(30, 400, "خلاصه مقاله"),
    body: faText(200, 60000, "متن مقاله"),
    /**
     * Categories are CMS records now, so the value is validated for shape
     * here and checked against the live category list inside the action —
     * an enum would go stale the moment an administrator adds one.
     */
    category: z.string().min(1, "دسته‌بندی مقاله را انتخاب کنید.").max(90),
    coverImage: z.string().min(1, "انتخاب تصویر شاخص الزامی است."),
    authorName: faText(3, 100, "نام نویسنده"),
    tags: z.preprocess(
      (v) =>
        typeof v === "string"
          ? v.split(/[،,]/).map((t) => t.trim()).filter(Boolean)
          : v,
      z.array(z.string().max(40)).max(8, "حداکثر ۸ برچسب مجاز است."),
    ),
    featured: z.coerce.boolean().default(false),
    status: contentStatusEnum.default("draft"),
    scheduledFor: z.string().max(40).optional().default(""),
    seo: cmsSeoSchema,
  })
  .refine(
    (data) => data.status !== "scheduled" || Boolean(data.scheduledFor),
    {
      message: "برای انتشار زمان‌بندی‌شده، تاریخ و ساعت انتشار را مشخص کنید.",
      path: ["scheduledFor"],
    },
  );

export type ArticleFormInput = z.infer<typeof articleFormSchema>;

export const serviceFormSchema = z.object({
  title: faText(3, 80, "عنوان خدمت"),
  slug: slugSchema,
  shortDescription: faText(30, 300, "توضیح کوتاه"),
  body: faText(100, 30000, "متن کامل"),
  category: z.enum(["arbitration", "dispute-resolution", "advisory"]),
  icon: z.string().min(1),
  highlights: z.preprocess(
    linesToArray,
    z.array(z.string().max(200)).max(8, "حداکثر ۸ مورد مجاز است."),
  ),
  image: z.string().max(400).optional().default(""),
  ctaLabel: z.string().max(60).optional().default(""),
  ctaHref: z.string().max(400).optional().default(""),
  order: z.coerce.number().int().min(0).max(999),
  status: contentStatusEnum.default("published"),
  scheduledFor: z.string().max(40).optional().default(""),
  seo: cmsSeoSchema,
});

export type ServiceFormInput = z.infer<typeof serviceFormSchema>;

export const arbitratorFormSchema = z.object({
  fullName: faText(3, 100, "نام و نام خانوادگی"),
  slug: slugSchema,
  title: faText(3, 120, "سمت"),
  shortBio: z.string().max(300, "معرفی کوتاه نباید بیشتر از ۳۰۰ نویسه باشد.").default(""),
  biography: z.string().max(20000, "متن معرفی بیش از حد مجاز است.").default(""),
  photoUrl: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().max(400).optional(),
  ),
  // Every credential list may legitimately be empty: the profile renders a
  // "pending" placeholder rather than forcing an administrator to invent one.
  expertise: z.preprocess(
    linesToArray,
    z.array(z.string().max(80)).max(10),
  ),
  practiceAreas: z.preprocess(
    linesToArray,
    z.array(z.string().max(80)).max(10),
  ),
  approach: z.string().max(4000).optional().default(""),
  languages: z.preprocess(
    linesToArray,
    z.array(z.string().max(40)).max(8),
  ),
  memberships: z.preprocess(
    linesToArray,
    z.array(z.string().max(160)).max(10),
  ),
  yearsOfExperience: z.coerce
    .number()
    .int()
    .min(0, "سابقه نمی‌تواند منفی باشد.")
    .max(70),
  email: optionalEmailSchema,
  education: z.preprocess(linesToArray, z.array(z.string().max(240)).max(12)),
  background: z.preprocess(linesToArray, z.array(z.string().max(240)).max(12)),
  order: z.coerce.number().int().min(0).max(999),
  bookable: z.coerce.boolean().default(true),
  published: z.coerce.boolean().default(true),
  seo: cmsSeoSchema,
});

export type ArbitratorFormInput = z.infer<typeof arbitratorFormSchema>;

export const faqFormSchema = z.object({
  question: faText(8, 200, "پرسش"),
  answer: faText(30, 4000, "پاسخ"),
  /** Administrators may introduce their own groups, so this is free-form. */
  topic: z
    .string()
    .trim()
    .min(1, "دسته پرسش را انتخاب یا وارد کنید.")
    .max(60),
  order: z.coerce.number().int().min(0).max(999),
  published: z.coerce.boolean().default(true),
});

export type FaqFormInput = z.infer<typeof faqFormSchema>;

export const settingsFormSchema = z.object({
  institutionName: faText(3, 120, "نام مؤسسه"),
  institutionShortName: faText(2, 60, "نام کوتاه"),
  tagline: faText(5, 160, "شعار"),
  description: faText(50, 600, "توضیح مؤسسه"),
  phones: z.preprocess(
    (v) => linesToArray(v).map((p) => digitsOnly(p)),
    z
      .array(z.string().regex(IRAN_PHONE, "یکی از شماره‌های تماس معتبر نیست."))
      .min(1, "حداقل یک شماره تماس وارد کنید.")
      .max(4),
  ),
  email: emailSchema,
  mobile: z.preprocess(
    (v) => (typeof v === "string" ? digitsOnly(v) : v),
    z
      .string()
      .max(15)
      .refine(
        (v) => v === "" || IRAN_MOBILE.test(v),
        "شماره موبایل معتبر نیست.",
      )
      .default(""),
  ),
  language: z.string().trim().max(12).default("fa-IR"),
  direction: z.enum(["rtl", "ltr"]).default("rtl"),
  logoUrl: z.string().max(400).optional().default(""),
  faviconUrl: z.string().max(400).optional().default(""),
  address: faText(10, 400, "آدرس"),
  postalCode: z.preprocess(
    (v) => (typeof v === "string" ? digitsOnly(v) : v),
    z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد."),
  ),
  registrationNumber: z.string().max(40).optional().default(""),
  mapEmbedUrl: z
    .string()
    .url("نشانی نقشه معتبر نیست.")
    .max(600)
    .refine(
      (url) => url.startsWith("https://"),
      "نشانی نقشه باید با https شروع شود.",
    ),
  mapLat: z.coerce.number().min(-90).max(90),
  mapLng: z.coerce.number().min(-180).max(180),

  /**
   * The notary office (دفتر اسناد رسمی) is a SEPARATE professional entity
   * belonging to a different person. It is validated as its own nested object
   * so it can never be merged into the institution's contact details, and it
   * stays hidden site-wide until an administrator both fills it in and ticks
   * `notaryEnabled`.
   */
  notaryEnabled: z.coerce.boolean().default(false),
  notaryOfficeName: z.string().max(160).optional().default(""),
  notaryName: z.string().max(120).optional().default(""),
  notaryPhone: z.preprocess(
    (v) => (typeof v === "string" ? digitsOnly(v) : v),
    z.string().max(20).optional().default(""),
  ),
  notaryAddress: z.string().max(400).optional().default(""),
  notaryNote: z.string().max(400).optional().default(""),
});

export type SettingsFormInput = z.infer<typeof settingsFormSchema>;

/* -------------------------------------------------------------------------- */
/*  Admin: workflow actions                                                   */
/* -------------------------------------------------------------------------- */

export const requestStatusEnum = z.enum([
  "submitted",
  "in-review",
  "approved",
  "needs-info",
  "scheduled",
  "completed",
  "cancelled",
]);

export const appointmentStatusEnum = z.enum([
  "pending",
  "confirmed",
  "rescheduled",
  "completed",
  "cancelled",
  "rejected",
]);

export const statusChangeSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  note: z.string().max(600).optional(),
});

export const noteSchema = z.object({
  id: z.string().min(1),
  body: faText(2, 2000, "متن یادداشت"),
});

export const rescheduleSchema = z.object({
  id: z.string().min(1),
  date: isoDateSchema,
  time: timeSchema,
});

export const userStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "pending", "suspended"]),
});

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Flattens a ZodError into `{ field: [messages] }` for form rendering. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (result[key] ??= []).push(issue.message);
  }

  return result;
}

/** Reads a FormData entry as a plain string. */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
