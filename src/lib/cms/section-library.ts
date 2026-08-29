import type {
  FieldDef,
  FieldOption,
  SectionData,
  SectionDefinition,
  SectionType,
} from "@/types";

/**
 * The section library.
 *
 * This registry is the contract between three things that would otherwise
 * drift apart:
 *
 *   • the admin editor, which renders itself entirely from `fields`;
 *   • the public renderer in `@/components/sections`, which reads the same
 *     field names back out;
 *   • validation, which coerces submitted values against `fields`.
 *
 * Adding a section type therefore means one entry here plus one renderer —
 * never a change to the editor, the page model or the storage layer.
 */

/* -------------------------------------------------------------------------- */
/*  Shared option sets                                                        */
/* -------------------------------------------------------------------------- */

const ALIGNMENT_OPTIONS: FieldOption[] = [
  { value: "start", label: "راست‌چین (شروع)" },
  { value: "center", label: "وسط‌چین" },
];

const IMAGE_POSITION_OPTIONS: FieldOption[] = [
  { value: "start", label: "تصویر در سمت راست" },
  { value: "end", label: "تصویر در سمت چپ" },
];

const COLUMN_OPTIONS: FieldOption[] = [
  { value: "2", label: "دو ستون" },
  { value: "3", label: "سه ستون" },
  { value: "4", label: "چهار ستون" },
];

const HERO_LAYOUT_OPTIONS: FieldOption[] = [
  { value: "split", label: "دو ستونه با تصویر" },
  { value: "centered", label: "وسط‌چین تمام‌عرض" },
  { value: "minimal", label: "ساده بدون تصویر" },
];

/* -------------------------------------------------------------------------- */
/*  Field fragments reused across sections                                    */
/* -------------------------------------------------------------------------- */

const eyebrowField: FieldDef = {
  name: "eyebrow",
  label: "برچسب بالای عنوان",
  kind: "text",
  placeholder: "مثلاً: خدمات تخصصی",
  half: true,
};

const headingField: FieldDef = {
  name: "heading",
  label: "عنوان",
  kind: "text",
  placeholder: "عنوان بخش",
};

const subtitleField: FieldDef = {
  name: "subtitle",
  label: "زیرعنوان",
  kind: "text",
  hint: "در ادامه عنوان و با رنگ روشن‌تر نمایش داده می‌شود.",
};

const descriptionField: FieldDef = {
  name: "description",
  label: "توضیح",
  kind: "textarea",
  rows: 4,
};

const primaryButtonFields: FieldDef[] = [
  {
    name: "primaryButtonText",
    label: "متن دکمه اصلی",
    kind: "text",
    half: true,
    placeholder: "مثلاً: رزرو وقت مشاوره",
  },
  {
    name: "primaryButtonUrl",
    label: "نشانی دکمه اصلی",
    kind: "url",
    half: true,
    placeholder: "/appointment",
  },
];

const secondaryButtonFields: FieldDef[] = [
  {
    name: "secondaryButtonText",
    label: "متن دکمه دوم",
    kind: "text",
    half: true,
  },
  {
    name: "secondaryButtonUrl",
    label: "نشانی دکمه دوم",
    kind: "url",
    half: true,
  },
];

const limitField = (label: string, max: number): FieldDef => ({
  name: "limit",
  label,
  kind: "number",
  min: 1,
  max,
  step: 1,
  half: true,
  hint: `حداکثر ${max} مورد.`,
});

const linkFields: FieldDef[] = [
  { name: "linkText", label: "متن پیوند", kind: "text", half: true },
  { name: "linkUrl", label: "نشانی پیوند", kind: "url", half: true },
];

/* -------------------------------------------------------------------------- */
/*  The library                                                               */
/* -------------------------------------------------------------------------- */

export const SECTION_LIBRARY: Record<SectionType, SectionDefinition> = {
  /* -- Hero ------------------------------------------------------------- */
  hero: {
    type: "hero",
    label: "بخش معرفی (Hero)",
    description:
      "نخستین بخش صفحه: عنوان اصلی، توضیح کوتاه، دکمه‌های اقدام و تصویر یا ویدئوی پس‌زمینه.",
    group: "layout",
    defaultBackground: "paper",
    defaultSpacing: "lg",
    fields: [
      { ...eyebrowField, half: false },
      { ...headingField, label: "عنوان اصلی" },
      subtitleField,
      { ...descriptionField, rows: 5 },
      ...primaryButtonFields,
      ...secondaryButtonFields,
      {
        name: "layout",
        label: "چیدمان",
        kind: "select",
        options: HERO_LAYOUT_OPTIONS,
        half: true,
      },
      {
        name: "alignment",
        label: "تراز متن",
        kind: "select",
        options: ALIGNMENT_OPTIONS,
        half: true,
      },
      {
        name: "image",
        label: "تصویر",
        kind: "image",
        hint: "در چیدمان دو ستونه کنار متن و در حالت تمام‌عرض به‌عنوان پس‌زمینه استفاده می‌شود.",
      },
      {
        name: "backgroundVideo",
        label: "ویدئوی پس‌زمینه",
        kind: "video",
        hint: "اختیاری. در صورت انتخاب، جایگزین تصویر پس‌زمینه می‌شود و بی‌صدا پخش می‌گردد.",
      },
      {
        name: "overlay",
        label: "تیرگی روی تصویر",
        kind: "number",
        min: 0,
        max: 90,
        step: 5,
        half: true,
        hint: "بین ۰ تا ۹۰. برای خوانا ماندن متن روی تصویر.",
      },
      {
        name: "assurances",
        label: "تضمین‌ها / نکات کوتاه",
        kind: "repeater",
        max: 6,
        titleField: "label",
        fields: [
          { name: "icon", label: "آیکون", kind: "icon", half: true },
          { name: "label", label: "متن", kind: "text", half: true },
        ],
      },
    ],
    defaults: {
      eyebrow: "",
      heading: "عنوان اصلی صفحه",
      subtitle: "",
      description: "",
      primaryButtonText: "",
      primaryButtonUrl: "",
      secondaryButtonText: "",
      secondaryButtonUrl: "",
      layout: "split",
      alignment: "start",
      image: "",
      backgroundVideo: "",
      overlay: 55,
      assurances: [],
    },
  },

  /* -- Text + image ------------------------------------------------------ */
  "text-image": {
    type: "text-image",
    label: "متن و تصویر",
    description:
      "یک ستون متن در کنار یک تصویر؛ مناسب معرفی، توضیح خدمت یا هر محتوای دو ستونه.",
    group: "content",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      {
        name: "imagePosition",
        label: "جایگاه تصویر",
        kind: "select",
        options: IMAGE_POSITION_OPTIONS,
        half: true,
      },
      headingField,
      descriptionField,
      {
        name: "body",
        label: "متن کامل",
        kind: "richtext",
        hint: "پشتیبانی از تیتر، فهرست، نقل‌قول و پیوند.",
      },
      { name: "image", label: "تصویر", kind: "image" },
      {
        name: "imageCaption",
        label: "شرح تصویر",
        kind: "text",
        half: true,
      },
      ...linkFields,
    ],
    defaults: {
      eyebrow: "",
      heading: "",
      description: "",
      body: "",
      image: "",
      imageCaption: "",
      imagePosition: "end",
      linkText: "",
      linkUrl: "",
    },
  },

  /* -- Rich text --------------------------------------------------------- */
  "rich-text": {
    type: "rich-text",
    label: "متن غنی",
    description: "یک ستون متن بلند با امکانات ویرایشگر؛ مناسب صفحات حقوقی و توضیحی.",
    group: "content",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      {
        name: "body",
        label: "متن",
        kind: "richtext",
      },
      {
        name: "narrow",
        label: "عرض مطالعه‌ای",
        kind: "toggle",
        hint: "متن را در ستونی باریک‌تر و خواناتر قرار می‌دهد.",
      },
    ],
    defaults: { eyebrow: "", heading: "", body: "", narrow: true },
  },

  /* -- Cards ------------------------------------------------------------- */
  cards: {
    type: "cards",
    label: "کارت‌ها",
    description:
      "مجموعه‌ای از کارت‌های دلخواه با عنوان، توضیح، آیکون یا تصویر و پیوند.",
    group: "content",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      {
        name: "columns",
        label: "تعداد ستون",
        kind: "select",
        options: COLUMN_OPTIONS,
        half: true,
      },
      {
        name: "numbered",
        label: "نمایش شماره ترتیبی",
        kind: "toggle",
        half: true,
      },
      {
        name: "items",
        label: "کارت‌ها",
        kind: "repeater",
        max: 12,
        titleField: "title",
        fields: [
          { name: "title", label: "عنوان", kind: "text" },
          { name: "description", label: "توضیح", kind: "textarea", rows: 3 },
          { name: "icon", label: "آیکون", kind: "icon", half: true },
          { name: "image", label: "تصویر", kind: "image", half: true },
          { name: "linkText", label: "متن پیوند", kind: "text", half: true },
          { name: "linkUrl", label: "نشانی پیوند", kind: "url", half: true },
          { name: "enabled", label: "فعال", kind: "toggle" },
        ],
      },
    ],
    defaults: {
      eyebrow: "",
      heading: "",
      description: "",
      columns: "3",
      numbered: false,
      items: [],
    },
  },

  /* -- Features ---------------------------------------------------------- */
  features: {
    type: "features",
    label: "ویژگی‌ها",
    description: "فهرست فشرده‌ای از ویژگی‌ها یا مزیت‌ها با آیکون.",
    group: "content",
    defaultBackground: "muted",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      {
        name: "columns",
        label: "تعداد ستون",
        kind: "select",
        options: COLUMN_OPTIONS,
        half: true,
      },
      {
        name: "items",
        label: "ویژگی‌ها",
        kind: "repeater",
        max: 12,
        titleField: "title",
        fields: [
          { name: "icon", label: "آیکون", kind: "icon", half: true },
          { name: "title", label: "عنوان", kind: "text", half: true },
          { name: "description", label: "توضیح", kind: "textarea", rows: 3 },
          { name: "enabled", label: "فعال", kind: "toggle" },
        ],
      },
    ],
    defaults: {
      eyebrow: "",
      heading: "",
      description: "",
      columns: "3",
      items: [],
    },
  },

  /* -- Statistics -------------------------------------------------------- */
  stats: {
    type: "stats",
    label: "آمار و ارقام",
    description:
      "نوار عددی. هر مورد را می‌توان جداگانه پنهان کرد — عددی که تأیید نشده نباید منتشر شود.",
    group: "content",
    defaultBackground: "navy",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      {
        name: "items",
        label: "آمارها",
        kind: "repeater",
        max: 8,
        titleField: "label",
        fields: [
          { name: "value", label: "عدد", kind: "text", half: true },
          { name: "suffix", label: "پسوند", kind: "text", half: true },
          { name: "label", label: "عنوان", kind: "text" },
          { name: "description", label: "توضیح", kind: "textarea", rows: 2 },
          { name: "enabled", label: "نمایش این مورد", kind: "toggle" },
        ],
      },
    ],
    defaults: { eyebrow: "", heading: "", description: "", items: [] },
  },

  /* -- Testimonials ------------------------------------------------------ */
  testimonials: {
    type: "testimonials",
    label: "نظرات",
    description: "نظرات ثبت‌شده در بخش «نظرات» را نمایش می‌دهد.",
    group: "collections",
    defaultBackground: "muted",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      limitField("تعداد نظرات", 12),
      {
        name: "showRating",
        label: "نمایش امتیاز",
        kind: "toggle",
        half: true,
      },
    ],
    defaults: {
      eyebrow: "",
      heading: "",
      description: "",
      limit: 3,
      showRating: true,
    },
  },

  /* -- FAQ --------------------------------------------------------------- */
  faq: {
    type: "faq",
    label: "پرسش‌های متداول",
    description: "پرسش‌های فعال را از بخش «پرسش‌های متداول» می‌خواند.",
    group: "collections",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      limitField("تعداد پرسش‌ها", 20),
      {
        name: "topic",
        label: "فقط دسته",
        kind: "text",
        half: true,
        hint: "خالی بگذارید تا همه دسته‌ها نمایش داده شود.",
      },
      ...linkFields,
    ],
    defaults: {
      eyebrow: "",
      heading: "پرسش‌های متداول",
      description: "",
      limit: 6,
      topic: "",
      linkText: "همه پرسش‌ها",
      linkUrl: "/faq",
    },
  },

  /* -- Gallery ----------------------------------------------------------- */
  gallery: {
    type: "gallery",
    label: "گالری تصاویر",
    description: "شبکه‌ای از تصاویر انتخاب‌شده از کتابخانه رسانه.",
    group: "content",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      {
        name: "columns",
        label: "تعداد ستون",
        kind: "select",
        options: COLUMN_OPTIONS,
        half: true,
      },
      {
        name: "items",
        label: "تصاویر",
        kind: "repeater",
        max: 24,
        titleField: "caption",
        fields: [
          { name: "image", label: "تصویر", kind: "image" },
          { name: "caption", label: "شرح", kind: "text", half: true },
          { name: "linkUrl", label: "نشانی پیوند", kind: "url", half: true },
          { name: "enabled", label: "فعال", kind: "toggle" },
        ],
      },
    ],
    defaults: {
      eyebrow: "",
      heading: "",
      description: "",
      columns: "3",
      items: [],
    },
  },

  /* -- Team -------------------------------------------------------------- */
  team: {
    type: "team",
    label: "اعضا و داوران",
    description:
      "پروفایل‌های ثبت‌شده در بخش «داوران و اعضا» را نمایش می‌دهد؛ هیچ نامی در کد ثابت نیست.",
    group: "collections",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      limitField("تعداد افراد", 12),
      {
        name: "columns",
        label: "تعداد ستون",
        kind: "select",
        options: COLUMN_OPTIONS,
        half: true,
      },
      {
        name: "showBio",
        label: "نمایش معرفی کوتاه",
        kind: "toggle",
        half: true,
      },
      ...linkFields,
    ],
    defaults: {
      eyebrow: "",
      heading: "",
      description: "",
      limit: 4,
      columns: "3",
      showBio: true,
      linkText: "",
      linkUrl: "",
    },
  },

  /* -- Timeline ---------------------------------------------------------- */
  timeline: {
    type: "timeline",
    label: "مراحل / زمان‌بندی",
    description:
      "مراحل یک فرآیند یا رویدادهای پیاپی، به‌صورت خط زمانی شماره‌گذاری‌شده.",
    group: "content",
    defaultBackground: "navy",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      {
        name: "items",
        label: "مراحل",
        kind: "repeater",
        max: 12,
        titleField: "title",
        fields: [
          { name: "marker", label: "شماره یا تاریخ", kind: "text", half: true },
          { name: "title", label: "عنوان", kind: "text", half: true },
          { name: "description", label: "توضیح", kind: "textarea", rows: 3 },
          { name: "enabled", label: "فعال", kind: "toggle" },
        ],
      },
    ],
    defaults: { eyebrow: "", heading: "", description: "", items: [] },
  },

  /* -- CTA --------------------------------------------------------------- */
  cta: {
    type: "cta",
    label: "فراخوان اقدام (CTA)",
    description: "نوار پایانی برای هدایت بازدیدکننده به رزرو، تماس یا فرم.",
    group: "conversion",
    defaultBackground: "navy",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      ...primaryButtonFields,
      ...secondaryButtonFields,
      {
        name: "phone",
        label: "شماره تماس",
        kind: "text",
        half: true,
        hint: "خالی بگذارید تا شماره اصلی مؤسسه استفاده شود.",
      },
      {
        name: "alignment",
        label: "تراز متن",
        kind: "select",
        options: ALIGNMENT_OPTIONS,
        half: true,
      },
      { name: "image", label: "تصویر پس‌زمینه", kind: "image" },
    ],
    defaults: {
      eyebrow: "",
      heading: "",
      description: "",
      primaryButtonText: "",
      primaryButtonUrl: "",
      secondaryButtonText: "",
      secondaryButtonUrl: "",
      phone: "",
      alignment: "center",
      image: "",
    },
  },

  /* -- Articles ---------------------------------------------------------- */
  articles: {
    type: "articles",
    label: "مقالات",
    description: "آخرین مقالات منتشرشده را از بخش «مقالات» می‌خواند.",
    group: "collections",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      limitField("تعداد مقالات", 12),
      {
        name: "category",
        label: "فقط دسته‌بندی",
        kind: "text",
        half: true,
        hint: "نامک دسته‌بندی. خالی یعنی همه دسته‌ها.",
      },
      {
        name: "featuredOnly",
        label: "فقط مقالات ویژه",
        kind: "toggle",
        half: true,
      },
      ...linkFields,
    ],
    defaults: {
      eyebrow: "",
      heading: "آخرین مقالات",
      description: "",
      limit: 3,
      category: "",
      featuredOnly: false,
      linkText: "همه مقالات",
      linkUrl: "/articles",
    },
  },

  /* -- Contact ----------------------------------------------------------- */
  contact: {
    type: "contact",
    label: "اطلاعات تماس",
    description:
      "نشانی، شماره‌ها، ایمیل و ساعات کاری را از تنظیمات سایت می‌خواند؛ نیازی به تکرار نیست.",
    group: "conversion",
    defaultBackground: "paper",
    defaultSpacing: "md",
    fields: [
      eyebrowField,
      { ...headingField, half: true },
      descriptionField,
      { name: "showAddress", label: "نمایش نشانی", kind: "toggle", half: true },
      { name: "showPhones", label: "نمایش شماره‌ها", kind: "toggle", half: true },
      { name: "showEmail", label: "نمایش ایمیل", kind: "toggle", half: true },
      { name: "showHours", label: "نمایش ساعات کاری", kind: "toggle", half: true },
      { name: "showSocials", label: "نمایش شبکه‌های اجتماعی", kind: "toggle", half: true },
      {
        name: "showForm",
        label: "نمایش فرم تماس",
        kind: "toggle",
        half: true,
        hint: "پیام‌های ارسالی مستقیماً در بخش «فرم‌ها» ثبت می‌شود.",
      },
    ],
    defaults: {
      eyebrow: "",
      heading: "ارتباط با ما",
      description: "",
      showAddress: true,
      showPhones: true,
      showEmail: true,
      showHours: true,
      showSocials: true,
      showForm: true,
    },
  },

  /* -- Map --------------------------------------------------------------- */
  map: {
    type: "map",
    label: "نقشه",
    description: "نقشه محل مؤسسه بر پایه نشانی تعبیه‌شده در تنظیمات سایت.",
    group: "conversion",
    defaultBackground: "paper",
    defaultSpacing: "sm",
    fields: [
      { ...headingField, half: true },
      {
        name: "height",
        label: "ارتفاع (پیکسل)",
        kind: "number",
        min: 200,
        max: 800,
        step: 20,
        half: true,
      },
      {
        name: "embedUrl",
        label: "نشانی نقشه",
        kind: "url",
        hint: "خالی بگذارید تا نشانی ثبت‌شده در تنظیمات سایت استفاده شود.",
      },
      { name: "showAddress", label: "نمایش نشانی زیر نقشه", kind: "toggle" },
    ],
    defaults: { heading: "", height: 420, embedUrl: "", showAddress: true },
  },

  /* -- Custom HTML ------------------------------------------------------- */
  "custom-html": {
    type: "custom-html",
    label: "کد HTML سفارشی",
    description:
      "برای موارد خاص. محتوای این بخش بدون پالایش در صفحه قرار می‌گیرد — پیشرفته.",
    group: "advanced",
    defaultBackground: "paper",
    defaultSpacing: "sm",
    fields: [
      { ...headingField, half: true },
      {
        name: "html",
        label: "کد HTML",
        kind: "textarea",
        rows: 12,
        hint: "فقط کدی را وارد کنید که منبع آن را می‌شناسید. این محتوا مستقیماً در صفحه اجرا می‌شود.",
      },
      {
        name: "contained",
        label: "قرارگیری در ستون اصلی",
        kind: "toggle",
        hint: "خاموش کنید تا کد تمام‌عرض صفحه رندر شود.",
      },
    ],
    defaults: { heading: "", html: "", contained: true },
  },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

export const SECTION_TYPES = Object.keys(SECTION_LIBRARY) as SectionType[];

export function getSectionDefinition(type: SectionType): SectionDefinition {
  return SECTION_LIBRARY[type] ?? SECTION_LIBRARY.cards;
}

export function isSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && value in SECTION_LIBRARY;
}

export const SECTION_GROUPS: {
  key: SectionDefinition["group"];
  label: string;
}[] = [
  { key: "layout", label: "ساختار صفحه" },
  { key: "content", label: "محتوا" },
  { key: "collections", label: "فهرست‌های سایت" },
  { key: "conversion", label: "ارتباط و اقدام" },
  { key: "advanced", label: "پیشرفته" },
];

/** A fresh `data` object for a newly added section. */
export function buildSectionDefaults(type: SectionType): SectionData {
  return structuredClone(getSectionDefinition(type).defaults);
}

/**
 * Every field a section owns, flattened.
 *
 * Repeater rows are excluded — they are addressed by row index at submission
 * time, not by a flat name.
 */
export function sectionFieldNames(type: SectionType): string[] {
  return getSectionDefinition(type).fields.map((field) => field.name);
}

export const SECTION_BACKGROUND_OPTIONS: FieldOption[] = [
  { value: "paper", label: "کاغذی (پیش‌فرض)" },
  { value: "muted", label: "کرم روشن" },
  { value: "white", label: "سفید" },
  { value: "navy", label: "سرمه‌ای تیره" },
];

export const SECTION_SPACING_OPTIONS: FieldOption[] = [
  { value: "none", label: "بدون فاصله" },
  { value: "sm", label: "کم" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "زیاد" },
];
