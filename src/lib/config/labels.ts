import type {
  AppointmentStatus,
  AppointmentTypeConfig,
  AuditAction,
  AuditEntity,
  CallWindow,
  ContactMessageStatus,
  ContactMethod,
  ContentStatus,
  MeetingMode,
  NewsletterStatus,
  RequestStatus,
  RequestType,
  ServiceCategory,
  SocialPlatform,
  SubmissionStatus,
  UserRole,
  UserStatus,
} from "@/types";
import type { IconName } from "@/components/ui/icon";

/**
 * Persian label dictionaries.
 *
 * Enum values stay in English inside the data model; every string a visitor
 * can read is resolved through this file. Keeping them together makes the UI
 * copy auditable and makes future i18n a matter of adding a second dictionary.
 */

/* -------------------------------------------------------------------------- */
/*  Request & appointment status                                              */
/* -------------------------------------------------------------------------- */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const REQUEST_STATUS: Record<
  RequestStatus,
  { label: string; tone: Tone; description: string }
> = {
  submitted: {
    label: "ثبت شده",
    tone: "neutral",
    description: "درخواست شما با موفقیت ثبت شد و در نوبت بررسی قرار دارد.",
  },
  "in-review": {
    label: "در حال بررسی",
    tone: "info",
    description: "کارشناسان مجموعه در حال مطالعه موضوع و مدارک شما هستند.",
  },
  approved: {
    label: "تأیید شده",
    tone: "success",
    description: "درخواست شما پذیرفته شد و مراحل بعدی به شما اعلام می‌شود.",
  },
  "needs-info": {
    label: "نیازمند اطلاعات بیشتر",
    tone: "warning",
    description: "برای ادامه بررسی، ارائه اطلاعات یا مدارک تکمیلی لازم است.",
  },
  scheduled: {
    label: "زمان‌بندی شده",
    tone: "info",
    description: "زمان جلسه تعیین شده و جزئیات آن برای شما ارسال گردیده است.",
  },
  completed: {
    label: "تکمیل شده",
    tone: "success",
    description: "رسیدگی به این درخواست به پایان رسیده است.",
  },
  cancelled: {
    label: "لغو شده",
    tone: "danger",
    description: "این درخواست لغو شده است.",
  },
};

export const REQUEST_STATUS_ORDER: RequestStatus[] = [
  "submitted",
  "in-review",
  "approved",
  "scheduled",
  "completed",
];

export const APPOINTMENT_STATUS: Record<
  AppointmentStatus,
  { label: string; tone: Tone; description: string }
> = {
  pending: {
    label: "در انتظار تأیید",
    tone: "warning",
    description: "رزرو شما ثبت شد و پس از بررسی، تأیید نهایی اعلام می‌شود.",
  },
  confirmed: {
    label: "تأیید شده",
    tone: "success",
    description: "جلسه شما قطعی است. لطفاً در زمان مقرر حاضر شوید.",
  },
  rescheduled: {
    label: "زمان‌بندی مجدد",
    tone: "info",
    description: "زمان جلسه تغییر کرده است؛ زمان جدید در ادامه آمده است.",
  },
  completed: {
    label: "برگزار شده",
    tone: "neutral",
    description: "این جلسه برگزار شده است.",
  },
  cancelled: {
    label: "لغو شده",
    tone: "danger",
    description: "این رزرو لغو شده است.",
  },
  rejected: {
    label: "رد شده",
    tone: "danger",
    description: "امکان برگزاری جلسه در زمان انتخابی وجود نداشت.",
  },
};

/**
 * The vocabulary shared by every public form.
 *
 * Contact messages, consultation enquiries and newsletter sign-ups all land in
 * one inbox, so they answer to one status list rather than three.
 */
export const SUBMISSION_STATUS: Record<
  SubmissionStatus,
  { label: string; tone: Tone }
> = {
  new: { label: "جدید", tone: "info" },
  "in-progress": { label: "در حال بررسی", tone: "warning" },
  completed: { label: "انجام شده", tone: "success" },
  rejected: { label: "رد شده", tone: "danger" },
  archived: { label: "بایگانی", tone: "neutral" },
};

export const SUBMISSION_STATUS_OPTIONS = (
  Object.keys(SUBMISSION_STATUS) as SubmissionStatus[]
).map((value) => ({ value, label: SUBMISSION_STATUS[value].label }));

/** Kept as an alias so existing call sites read naturally. */
export const CONTACT_MESSAGE_STATUS: Record<
  ContactMessageStatus,
  { label: string; tone: Tone }
> = SUBMISSION_STATUS;

export const NEWSLETTER_STATUS: Record<
  NewsletterStatus,
  { label: string; tone: Tone }
> = {
  new: { label: "جدید", tone: "info" },
  confirmed: { label: "تأیید شده", tone: "success" },
  unsubscribed: { label: "لغو اشتراک", tone: "neutral" },
};

/* -------------------------------------------------------------------------- */
/*  Request taxonomy                                                          */
/* -------------------------------------------------------------------------- */

export const REQUEST_TYPE: Record<RequestType, string> = {
  consultation: "مشاوره حقوقی",
  arbitration: "درخواست داوری",
  mediation: "میانجی‌گری",
  "contract-review": "بررسی و تنظیم قرارداد",
  representation: "وکالت و طرح دعوا",
};

export const REQUEST_TYPE_OPTIONS = (
  Object.keys(REQUEST_TYPE) as RequestType[]
).map((value) => ({ value, label: REQUEST_TYPE[value] }));

export const CONTACT_METHOD: Record<ContactMethod, string> = {
  phone: "تماس تلفنی",
  whatsapp: "واتس‌اپ",
  email: "ایمیل",
  "in-person": "مراجعه حضوری",
};

export const CONTACT_METHOD_OPTIONS = (
  Object.keys(CONTACT_METHOD) as ContactMethod[]
).map((value) => ({ value, label: CONTACT_METHOD[value] }));

export const CALL_WINDOW: Record<CallWindow, string> = {
  morning: "صبح (۹ تا ۱۲)",
  afternoon: "بعدازظهر (۱۲ تا ۱۷)",
  evening: "عصر (۱۷ تا ۲۰)",
};

export const CALL_WINDOW_OPTIONS = (
  Object.keys(CALL_WINDOW) as CallWindow[]
).map((value) => ({ value, label: CALL_WINDOW[value] }));

/**
 * Legal areas offered in the consultation form.
 *
 * These label the *subject of the enquiry*, not services the institution
 * claims to provide. Keep the list domestic — no cross-border entries.
 */
export const LEGAL_AREAS: string[] = [
  "داوری",
  "میانجی‌گری و سازش",
  "قراردادهای تجاری",
  "پیمانکاری و ساخت",
  "اختلافات شرکا و سهامداران",
  "املاک و مستغلات",
  "مطالبات و اسناد تجاری",
  "سایر موضوعات حقوقی",
];

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

export const MEETING_MODE: Record<
  MeetingMode,
  { label: string; description: string }
> = {
  "in-person": {
    label: "حضوری",
    description: "برگزاری جلسه در محل مؤسسه",
  },
  online: {
    label: "آنلاین",
    description: "جلسه تصویری از طریق لینک اختصاصی",
  },
  phone: {
    label: "تلفنی",
    description: "تماس تلفنی در زمان تعیین‌شده",
  },
};

/**
 * Consultation types now live in the CMS (`settings.appointments.types`).
 *
 * This helper resolves a stored key against the configured list so a booking
 * made before a type was renamed still renders a meaningful label instead of
 * a raw slug.
 */
export function resolveConsultationType(
  value: string,
  types: AppointmentTypeConfig[],
): AppointmentTypeConfig | null {
  return types.find((type) => type.value === value) ?? null;
}

export function consultationTypeLabel(
  value: string,
  types: AppointmentTypeConfig[],
): string {
  return resolveConsultationType(value, types)?.title ?? value;
}

/** Iranian week, Saturday-first — the order every Persian calendar uses. */
export const WEEKDAYS: string[] = [
  "شنبه",
  "یک‌شنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

/* -------------------------------------------------------------------------- */
/*  Content taxonomy                                                          */
/* -------------------------------------------------------------------------- */

export const SERVICE_CATEGORY: Record<ServiceCategory, string> = {
  arbitration: "داوری",
  "dispute-resolution": "حل‌وفصل اختلافات",
  advisory: "مشاوره و قراردادها",
};

/**
 * Article categories and FAQ groups are CMS records now.
 *
 * `@/lib/db` is the source of truth; these helpers only cover the display side
 * so a value that no longer matches a category still renders as itself rather
 * than as `undefined`.
 */
export function categoryLabel(
  slug: string,
  categories: { slug: string; title: string }[],
): string {
  return categories.find((category) => category.slug === slug)?.title ?? slug;
}

/**
 * Suggested FAQ groups.
 *
 * Administrators may introduce their own, so this is a lookup with a
 * pass-through fallback rather than an exhaustive map.
 */
export const FAQ_TOPIC: Record<string, string> = {
  arbitration: "درباره داوری",
  process: "فرآیند رسیدگی",
  fees: "هزینه‌ها و تعرفه",
  general: "پرسش‌های عمومی",
};

export function faqTopicLabel(topic: string): string {
  return FAQ_TOPIC[topic] ?? topic;
}

export const FAQ_TOPIC_OPTIONS = Object.entries(FAQ_TOPIC).map(
  ([value, label]) => ({ value, label }),
);

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

export const USER_ROLE: Record<UserRole, string> = {
  admin: "مدیر ارشد",
  editor: "مدیر محتوا",
  manager: "مدیر عملیات",
  client: "کاربر",
};

export const USER_ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: "دسترسی کامل به همه بخش‌ها، شامل تنظیمات، کاربران و کدهای پیشرفته.",
  editor: "مدیریت صفحات، مقالات، خدمات، رسانه‌ها و سایر محتوای سایت.",
  manager: "مدیریت فرم‌ها، درخواست‌ها و نوبت‌ها؛ بدون دسترسی به تنظیمات سایت.",
  client: "کاربر عادی وب‌سایت؛ دسترسی به پنل مدیریت ندارد.",
};

export const USER_STATUS: Record<UserStatus, { label: string; tone: Tone }> = {
  active: { label: "فعال", tone: "success" },
  pending: { label: "در انتظار تأیید", tone: "warning" },
  suspended: { label: "مسدود", tone: "danger" },
};


/* -------------------------------------------------------------------------- */
/*  Publication workflow                                                      */
/* -------------------------------------------------------------------------- */

export const CONTENT_STATUS: Record<
  ContentStatus,
  { label: string; tone: Tone; description: string }
> = {
  draft: {
    label: "پیش‌نویس",
    tone: "neutral",
    description: "فقط در پنل مدیریت دیده می‌شود و روی وب‌سایت منتشر نشده است.",
  },
  published: {
    label: "منتشر شده",
    tone: "success",
    description: "روی وب‌سایت در دسترس عموم است.",
  },
  scheduled: {
    label: "زمان‌بندی شده",
    tone: "info",
    description: "در تاریخ و ساعت تعیین‌شده به‌صورت خودکار منتشر می‌شود.",
  },
  archived: {
    label: "بایگانی",
    tone: "warning",
    description: "از وب‌سایت برداشته شده اما حذف نشده است.",
  },
};

export const CONTENT_STATUS_OPTIONS = (
  Object.keys(CONTENT_STATUS) as ContentStatus[]
).map((value) => ({ value, label: CONTENT_STATUS[value].label }));

/* -------------------------------------------------------------------------- */
/*  Social platforms                                                          */
/* -------------------------------------------------------------------------- */

export const SOCIAL_PLATFORM: Record<
  SocialPlatform,
  { label: string; icon: IconName }
> = {
  linkedin: { label: "لینکدین", icon: "linkedin" },
  instagram: { label: "اینستاگرام", icon: "instagram" },
  telegram: { label: "تلگرام", icon: "telegram" },
  x: { label: "ایکس (توییتر)", icon: "x" },
  whatsapp: { label: "واتس‌اپ", icon: "whatsapp" },
  aparat: { label: "آپارات", icon: "aparat" },
  youtube: { label: "یوتیوب", icon: "youtube" },
  facebook: { label: "فیسبوک", icon: "facebook" },
  website: { label: "وب‌سایت", icon: "globe" },
};

export const SOCIAL_PLATFORM_OPTIONS = (
  Object.keys(SOCIAL_PLATFORM) as SocialPlatform[]
).map((value) => ({ value, label: SOCIAL_PLATFORM[value].label }));

/* -------------------------------------------------------------------------- */
/*  Audit log                                                                 */
/* -------------------------------------------------------------------------- */

export const AUDIT_ACTION: Record<AuditAction, { label: string; tone: Tone }> = {
  create: { label: "ایجاد", tone: "success" },
  update: { label: "ویرایش", tone: "info" },
  delete: { label: "حذف", tone: "danger" },
  publish: { label: "انتشار", tone: "success" },
  unpublish: { label: "لغو انتشار", tone: "warning" },
  reorder: { label: "تغییر ترتیب", tone: "neutral" },
  restore: { label: "بازگردانی", tone: "info" },
  upload: { label: "بارگذاری", tone: "neutral" },
  status: { label: "تغییر وضعیت", tone: "info" },
  login: { label: "ورود", tone: "neutral" },
  logout: { label: "خروج", tone: "neutral" },
  "login-failed": { label: "ورود ناموفق", tone: "danger" },
  sms: { label: "ارسال پیامک", tone: "info" },
};

export const AUDIT_ENTITY: Record<AuditEntity, string> = {
  page: "صفحه",
  section: "بخش صفحه",
  article: "مقاله",
  service: "خدمت",
  arbitrator: "داور / عضو",
  faq: "پرسش متداول",
  category: "دسته‌بندی",
  testimonial: "نظر",
  media: "رسانه",
  user: "کاربر",
  settings: "تنظیمات سایت",
  header: "هدر",
  footer: "فوتر",
  branding: "هویت بصری",
  seo: "سئو",
  appointment: "نوبت",
  request: "درخواست",
  message: "پیام تماس",
  newsletter: "خبرنامه",
  session: "نشست کاربری",
  sms: "پیامک",
};

export const AUDIT_ACTION_OPTIONS = [
  { value: "all", label: "همه عملیات" },
  ...(Object.keys(AUDIT_ACTION) as AuditAction[]).map((value) => ({
    value,
    label: AUDIT_ACTION[value].label,
  })),
];

export const AUDIT_ENTITY_OPTIONS = [
  { value: "all", label: "همه بخش‌ها" },
  ...(Object.keys(AUDIT_ENTITY) as AuditEntity[]).map((value) => ({
    value,
    label: AUDIT_ENTITY[value],
  })),
];

/* -------------------------------------------------------------------------- */
/*  Shared UI copy                                                            */
/* -------------------------------------------------------------------------- */

export const UI = {
  loading: "در حال بارگذاری…",
  submitting: "در حال ارسال…",
  saving: "در حال ذخیره‌سازی…",
  retry: "تلاش مجدد",
  cancel: "انصراف",
  confirm: "تأیید",
  save: "ذخیره",
  edit: "ویرایش",
  delete: "حذف",
  back: "بازگشت",
  next: "مرحله بعد",
  prev: "مرحله قبل",
  search: "جست‌وجو",
  filter: "فیلتر",
  clearFilters: "حذف فیلترها",
  viewDetails: "مشاهده جزئیات",
  readMore: "ادامه مطلب",
  noResults: "موردی یافت نشد",
  genericError: "متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  networkError: "ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.",
  requiredField: "تکمیل این فیلد الزامی است.",
  copied: "در حافظه کپی شد",
  copy: "کپی",

  /* -- CMS ------------------------------------------------------------- */
  add: "افزودن",
  duplicate: "تکثیر",
  preview: "پیش‌نمایش",
  publish: "انتشار",
  unpublish: "لغو انتشار",
  saveChanges: "ذخیره تغییرات",
  saved: "تغییرات ذخیره شد",
  deleted: "با موفقیت حذف شد",
  moveUp: "انتقال به بالا",
  moveDown: "انتقال به پایین",
  show: "نمایش",
  hide: "پنهان کردن",
  reorder: "تغییر ترتیب",
  selectMedia: "انتخاب از کتابخانه",
  uploadMedia: "بارگذاری فایل",
  removeMedia: "حذف تصویر",
  unsavedChanges:
    "تغییرات ذخیره‌نشده‌ای دارید. اگر از این صفحه خارج شوید، این تغییرات از دست می‌رود.",
  confirmDelete: "آیا از حذف این مورد مطمئن هستید؟ این عملیات قابل بازگشت نیست.",
  emptyList: "هنوز موردی ثبت نشده است.",
  loadingList: "در حال دریافت اطلاعات…",
} as const;
