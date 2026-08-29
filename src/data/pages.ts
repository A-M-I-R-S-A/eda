import type { Page, PageSection, SectionData, SectionType } from "@/types";
import { buildSectionDefaults } from "@/lib/cms/section-library";
import { LEGAL_PAGE_BODIES } from "./legal";

/**
 * Seed pages.
 *
 * This file is the *only* place the original hand-written page copy survives,
 * and it survives as editable seed data rather than as JSX a component reads.
 * Once the store has been written, nothing here is consulted again — an
 * administrator's edits are the source of truth.
 *
 * `system: true` marks a page whose route is hand-built because it does
 * something sections cannot express (a booking wizard, a filtered archive).
 * Its copy and SEO stay fully editable; only the slug and deletion are locked.
 */

let sequence = 0;
const seedId = (prefix: string) => `${prefix}-${(sequence += 1).toString(36)}`;

const SEED_TIME = "2026-06-01T08:00:00.000Z";

/** Builds a section, filling anything unspecified from the library defaults. */
function section(
  type: SectionType,
  name: string,
  data: SectionData,
  options: Partial<Omit<PageSection, "id" | "type" | "name" | "data">> = {},
): PageSection {
  return {
    id: seedId("sec"),
    type,
    name,
    visible: true,
    order: 0,
    background: options.background ?? "paper",
    spacing: options.spacing ?? "md",
    data: { ...buildSectionDefaults(type), ...data },
  };
}

function page(
  input: Omit<Page, "createdAt" | "updatedAt" | "sections"> & {
    sections: PageSection[];
  },
): Page {
  return {
    ...input,
    sections: input.sections.map((s, index) => ({ ...s, order: index })),
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  };
}

/* -------------------------------------------------------------------------- */
/*  Home                                                                      */
/* -------------------------------------------------------------------------- */

const HOME = page({
  id: "page-home",
  slug: "",
  title: "صفحه اصلی",
  excerpt:
    "داوری، رسیدگی به اختلافات، میانجی‌گری، مشاوره حقوقی و تنظیم و بررسی قراردادها.",
  status: "published",
  publishedAt: SEED_TIME,
  showInNav: false,
  order: 0,
  system: true,
  systemNote:
    "صفحه نخست وب‌سایت. نشانی آن ثابت است اما تمام بخش‌های آن قابل ویرایش، جابه‌جایی و حذف است.",
  seo: {
    metaTitle: "داوری، میانجی‌گری و مشاوره حقوقی",
    metaDescription:
      "مؤسسه داوری دادآور؛ داوری، رسیدگی به اختلافات، میانجی‌گری، مشاوره حقوقی و تنظیم و بررسی قراردادها. رزرو وقت مشاوره و ثبت آنلاین درخواست داوری.",
  },
  sections: [
    section(
      "hero",
      "معرفی اصلی",
      {
        eyebrow: "مؤسسه داوری دادآور",
        heading: "داوری و حل‌وفصل تخصصی اختلافات",
        subtitle: "برای تصمیم‌های مهم",
        description:
          "اختلافات تجاری با رسیدگی تخصصی، محرمانه و در زمان معقول حل می‌شوند. مؤسسه دادآور، از بررسی شرط داوری تا صدور رأی، مسیر رسیدگی را روشن و پاسخگو نگه می‌دارد.",
        primaryButtonText: "رزرو وقت مشاوره",
        primaryButtonUrl: "/appointment",
        secondaryButtonText: "درخواست داوری",
        secondaryButtonUrl: "/contact",
        layout: "split",
        assurances: [
          { icon: "lock", label: "محرمانگی کامل پرونده", enabled: true },
          { icon: "shield", label: "استقلال و بی‌طرفی داور", enabled: true },
          { icon: "clock", label: "بررسی درخواست در روزهای کاری", enabled: true },
        ],
      },
      { spacing: "lg" },
    ),

    section("features", "حوزه‌های کاری", {
      columns: "4",
      items: [
        { icon: "scale-minimal", title: "داوری", description: "مواد ۴۵۴ تا ۵۰۱ ق.آ.د.م", enabled: true },
        { icon: "layers", title: "رسیدگی به اختلافات", description: "تعیین مسیر متناسب با پرونده", enabled: true },
        { icon: "handshake", title: "میانجی‌گری", description: "سازش با حفظ رابطه تجاری", enabled: true },
        { icon: "document", title: "قراردادها", description: "تنظیم و بررسی پیش از امضا", enabled: true },
      ],
    }, { background: "muted", spacing: "sm" }),

    section("text-image", "درباره مجموعه", {
      eyebrow: "درباره مجموعه",
      heading: "رسیدگی تخصصی، خارج از پیچیدگی‌های رویه‌های طولانی",
      description:
        "مؤسسه داوری دادآور با این باور تأسیس شد که بخش بزرگی از اختلافات تجاری، نه به رسیدگی طولانی، بلکه به مرجعی نیاز دارند که موضوع را بفهمد و در زمان معقول تصمیم بگیرد.",
      body: "ما پرونده را از منظر ساختار اقتصادی معامله می‌بینیم، نه صرفاً از دریچه متن قرارداد. همین نگاه است که تفاوت میان رأیی قابل اجرا و رأیی صرفاً درست را می‌سازد.\n\n> داوری زمانی ارزش دارد که هم سریع باشد و هم قابل دفاع؛ کوتاه کردن مسیر نباید به قیمت تضعیف حق دفاع تمام شود.",
      imagePosition: "end",
      linkText: "معرفی کامل مؤسسه",
      linkUrl: "/about",
    }),

    section("cards", "اصول کاری", {
      numbered: true,
      columns: "2",
      items: [
        {
          title: "استقلال و بی‌طرفی",
          description:
            "هر داور پیش از پذیرش سمت، اظهارنامه استقلال امضا می‌کند و موظف است هر رابطه‌ای را که ممکن است بر بی‌طرفی اثر بگذارد افشا نماید.",
          enabled: true,
        },
        {
          title: "محرمانگی مطلق",
          description:
            "جریان رسیدگی، مستندات و رأی، خارج از دایره طرفین و تیم رسیدگی‌کننده منتشر نمی‌شود.",
          enabled: true,
        },
        {
          title: "تخصص موضوعی",
          description:
            "پرونده به داوری ارجاع می‌شود که هم به قواعد حقوقی مسلط است و هم زبان صنعت مربوطه را می‌فهمد.",
          enabled: true,
        },
        {
          title: "مدیریت زمان",
          description:
            "تقویم دادرسی در نخستین جلسه تنظیم می‌شود تا مهلت‌ها از پیش برای طرفین روشن باشد.",
          enabled: true,
        },
      ],
    }, { background: "muted" }),

    section("cards", "مسیرهای حل اختلاف", {
      eyebrow: "داوری و حل اختلاف",
      heading: "مسیرهای پایان دادن به یک اختلاف",
      description:
        "انتخاب روش درست، به‌اندازه خودِ رسیدگی اهمیت دارد. پیش از هر اقدام، مسیر متناسب با پرونده شما مشخص می‌شود.",
      columns: "3",
      items: [
        {
          title: "داوری",
          description:
            "رسیدگی و صدور رأی لازم‌الاجرا بر پایه شرط داوری قرارداد یا موافقت‌نامه مستقل، در چارچوب مقررات داوری ایران.",
          icon: "scale-minimal",
          enabled: true,
        },
        {
          title: "رسیدگی به اختلافات",
          description:
            "ارزیابی ماهیت اختلاف و تعیین اینکه موضوع از کدام مسیر — مذاکره، میانجی‌گری یا داوری — بهتر حل می‌شود.",
          icon: "layers",
          enabled: true,
        },
        {
          title: "میانجی‌گری",
          description:
            "رسیدن به توافق با کمک میانجی بی‌طرف، بدون صدور رأی الزام‌آور و با حفظ رابطه تجاری طرفین.",
          icon: "handshake",
          enabled: true,
        },
        {
          title: "مذاکره ساختاریافته",
          description:
            "طراحی و مدیریت مذاکره میان طرفین با تعیین دستورجلسه، موضوعات مورد بحث و سناریوهای جایگزین.",
          icon: "compass",
          enabled: true,
        },
        {
          title: "مشاوره حقوقی",
          description:
            "بررسی موضوع و اسناد، تعیین مرجع صالح و ارائه گزینه‌های پیش رو همراه با الزامات هر مسیر.",
          icon: "briefcase",
          enabled: true,
        },
        {
          title: "تنظیم و بررسی قراردادها",
          description:
            "نگارش و بازبینی قرارداد با تمرکز بر شفافیت تعهدات، مدیریت ریسک و طراحی شرط حل اختلاف.",
          icon: "document",
          enabled: true,
        },
      ],
    }),

    section("timeline", "فرآیند رسیدگی", {
      eyebrow: "فرآیند رسیدگی",
      heading: "از ثبت درخواست تا صدور رأی",
      description:
        "هفت گام روشن که پیش از شروع رسیدگی برای هر دو طرف اعلام می‌شود.",
      items: [
        { marker: "۰۱", title: "ثبت درخواست", description: "تماس با مؤسسه و ارائه قرارداد حاوی شرط داوری همراه با مستندات کلیدی.", enabled: true },
        { marker: "۰۲", title: "بررسی اولیه", description: "احراز صلاحیت مرجع داوری، بررسی اعتبار شرط داوری و قابلیت ارجاع موضوع.", enabled: true },
        { marker: "۰۳", title: "تعیین فرآیند رسیدگی", description: "توافق بر آیین رسیدگی، زبان، مهلت‌ها و تنظیم تقویم دادرسی با حضور طرفین.", enabled: true },
        { marker: "۰۴", title: "تعیین یا انتخاب داور", description: "پذیرش سمت از سوی داور و امضای اظهارنامه استقلال و بی‌طرفی.", enabled: true },
        { marker: "۰۵", title: "برگزاری جلسات", description: "استماع اظهارات طرفین به‌صورت حضوری یا آنلاین و تنظیم صورت‌جلسه رسیدگی.", enabled: true },
        { marker: "۰۶", title: "رسیدگی به ادعاها و دفاعیات", description: "بررسی ادله، ارجاع مسائل فنی و مالی به کارشناسی و تبادل لوایح تکمیلی.", enabled: true },
        { marker: "۰۷", title: "صدور رأی", description: "انشای رأی مستدل و مستند، تعیین تکلیف هزینه‌ها و ابلاغ رسمی به طرفین.", enabled: true },
      ],
    }, { background: "navy" }),

    section("team", "داور مؤسسه", {
      eyebrow: "داور مؤسسه",
      heading: "مسئولیت رسیدگی، با یک نفر مشخص",
      description:
        "پرونده میان چند نفر دست‌به‌دست نمی‌شود؛ از نخستین بررسی تا صدور رأی، مخاطب شما روشن است.",
      limit: 3,
      columns: "3",
      showBio: true,
      linkText: "معرفی کامل داور",
      linkUrl: "/arbitrator",
    }),

    section("articles", "آخرین مقالات", {
      eyebrow: "مرکز دانش",
      heading: "تحلیل‌ها و یادداشت‌های حقوقی",
      description:
        "مطالبی درباره داوری، قراردادها و حل‌وفصل اختلافات، با زبانی که برای غیرحقوق‌دان هم قابل استفاده باشد.",
      limit: 3,
      linkText: "همه مقالات",
      linkUrl: "/articles",
    }, { background: "muted" }),

    section("faq", "پرسش‌های متداول", {
      eyebrow: "پرسش‌های متداول",
      heading: "پیش از ثبت درخواست، این‌ها را بدانید",
      limit: 6,
      linkText: "همه پرسش‌ها",
      linkUrl: "/faq",
    }),

    section("cta", "فراخوان پایانی", {
      eyebrow: "گام بعدی",
      heading: "درباره پرونده خود مطمئن نیستید؟",
      description:
        "در یک جلسه مشاوره، مسیر حقوقی موضوع، گزینه‌های پیش رو و برآورد زمان و هزینه هر مسیر برای شما روشن می‌شود.",
      primaryButtonText: "رزرو وقت مشاوره",
      primaryButtonUrl: "/appointment",
      secondaryButtonText: "ثبت درخواست",
      secondaryButtonUrl: "/contact",
    }, { background: "navy" }),
  ],
});

/* -------------------------------------------------------------------------- */
/*  About                                                                     */
/* -------------------------------------------------------------------------- */

const ABOUT = page({
  id: "page-about",
  slug: "about",
  title: "درباره مجموعه",
  excerpt:
    "مأموریت، فلسفه حرفه‌ای، رویکرد محرمانگی و شیوه مدیریت پرونده‌های داوری.",
  status: "published",
  publishedAt: SEED_TIME,
  showInNav: true,
  order: 1,
  system: false,
  seo: {
    metaTitle: "درباره مجموعه",
    metaDescription:
      "معرفی مؤسسه داوری دادآور؛ مأموریت، فلسفه حرفه‌ای، رویکرد محرمانگی و شیوه مدیریت پرونده‌های داوری، با محوریت داور مؤسسه.",
  },
  sections: [
    section("hero", "سربرگ صفحه", {
      eyebrow: "درباره مجموعه",
      heading: "مؤسسه‌ای که برای تصمیم‌گیری ساخته شده، نه برای طولانی کردن مسیر",
      description:
        "مؤسسه داوری دادآور، مرجعی تخصصی برای رسیدگی به اختلافات اشخاص حقیقی و حقوقی در چارچوب مقررات داوری ایران است.",
      layout: "minimal",
    }, { background: "navy", spacing: "md" }),

    section("rich-text", "مأموریت ما", {
      eyebrow: "مأموریت ما",
      heading: "اختلاف تجاری، یک مسئله حقوقی و یک مسئله اقتصادی است",
      narrow: false,
      body: "بیشتر اختلافاتی که به ما ارجاع می‌شوند، صرفاً بر سر تفسیر یک ماده قانونی نیستند؛ پشت هر پرونده، قراردادی وجود دارد که در شرایط اقتصادی مشخصی امضا شده و سپس آن شرایط تغییر کرده است. رسیدگی مؤثر بدون درک این لایه اقتصادی ممکن نیست.\n\nاین مؤسسه با این نگاه تأسیس شد که ارزش یک مرجع رسیدگی، در سه چیز خلاصه می‌شود: **فهم موضوع**، **احترام کامل به حق دفاع طرفین** و **تصمیم‌گیری در زمان معقول**. حذف هر یک از این سه، رسیدگی را از اعتبار می‌اندازد.\n\n> داوری زمانی ارزش دارد که هم سریع باشد و هم قابل دفاع؛ کوتاه کردن مسیر نباید به قیمت تضعیف حق دفاع تمام شود.\n\nبه همین دلیل، پیش از پذیرش هر پرونده، صلاحیت مرجع داوری و قابلیت ارجاع موضوع بررسی می‌شود و در صورتی که داوری مسیر مناسبی نباشد، همین را صریح به متقاضی اعلام می‌کنیم.",
    }),

    section("cards", "فلسفه حرفه‌ای", {
      eyebrow: "فلسفه حرفه‌ای",
      heading: "اصولی که رسیدگی بر پایه آن‌ها انجام می‌شود",
      description:
        "این اصول شعار نیستند؛ هر کدام در آیین‌نامه داخلی مؤسسه به رویه‌ای مشخص ترجمه شده‌اند.",
      columns: "3",
      items: [
        { icon: "shield", title: "استقلال و بی‌طرفی", description: "داور پیش از پذیرش سمت، اظهارنامه استقلال امضا می‌کند و موظف است هر رابطه‌ای را که ممکن است بر بی‌طرفی او اثر بگذارد افشا نماید. این تعهد در تمام طول رسیدگی ادامه دارد.", enabled: true },
        { icon: "lock", title: "محرمانگی حرفه‌ای", description: "دسترسی به پرونده محدود به داور و دبیرخانه رسیدگی است. مستندات خارج از دسترس عمومی نگهداری می‌شوند و انتقال اطلاعات از مسیر رمزنگاری‌شده انجام می‌گیرد.", enabled: true },
        { icon: "compass", title: "پذیرش سنجیده پرونده", description: "پیش از پذیرش، صلاحیت مرجع داوری و قابلیت ارجاع موضوع بررسی می‌شود. اگر داوری مسیر مناسبی برای پرونده نباشد، همین را صریح اعلام می‌کنیم.", enabled: true },
        { icon: "clock", title: "مدیریت زمان رسیدگی", description: "تقویم دادرسی در نخستین جلسه با توافق طرفین تنظیم می‌شود تا مهلت تبادل لوایح، ارائه مستندات و جلسه استماع از پیش برای همه روشن باشد.", enabled: true },
        { icon: "users", title: "مسئولیت روشن", description: "پرونده میان چند نفر دست‌به‌دست نمی‌شود؛ از نخستین بررسی تا صدور رأی، مسئولیت رسیدگی با داور مؤسسه است و مخاطب شما مشخص است.", enabled: true },
        { icon: "document", title: "رأی قابل اجرا", description: "کیفیت یک رأی داوری با میزان روشنی استدلال و قابلیت اجرای آن سنجیده می‌شود، نه با طول آن. انشای رأی با همین معیار انجام می‌گیرد.", enabled: true },
      ],
    }, { background: "muted" }),

    section("team", "داور مؤسسه", {
      eyebrow: "داور مؤسسه",
      heading: "مسئولیت رسیدگی، با یک نفر مشخص",
      limit: 3,
      columns: "3",
      showBio: true,
      linkText: "معرفی کامل داور",
      linkUrl: "/arbitrator",
    }),

    section("cta", "فراخوان پایانی", {
      eyebrow: "گام بعدی",
      heading: "می‌خواهید بدانید پرونده شما در کدام مسیر قرار می‌گیرد؟",
      description:
        "در نخستین جلسه، صلاحیت مرجع داوری، گزینه‌های پیش رو و برآورد زمان و هزینه هر مسیر برای شما روشن می‌شود.",
      primaryButtonText: "رزرو وقت مشاوره",
      primaryButtonUrl: "/appointment",
      secondaryButtonText: "ثبت درخواست",
      secondaryButtonUrl: "/contact",
    }, { background: "navy" }),
  ],
});

/* -------------------------------------------------------------------------- */
/*  Arbitration                                                               */
/* -------------------------------------------------------------------------- */

const ARBITRATION = page({
  id: "page-arbitration",
  slug: "arbitration",
  title: "داوری",
  excerpt:
    "فرآیند رسیدگی، مبانی قانونی، تفاوت داوری و دادگاه و ثبت آنلاین درخواست داوری.",
  status: "published",
  publishedAt: SEED_TIME,
  showInNav: true,
  order: 2,
  system: false,
  seo: {
    metaTitle: "داوری در مؤسسه دادآور",
    metaDescription:
      "داوری، رسیدگی به اختلافات، میانجی‌گری و روش‌های جایگزین حل اختلاف؛ فرآیند رسیدگی، مبانی قانونی، هزینه‌ها و ثبت آنلاین درخواست داوری.",
  },
  sections: [
    section("hero", "سربرگ صفحه", {
      eyebrow: "داوری و حل اختلاف",
      heading: "اختلاف را جایی حل کنید که موضوع را می‌فهمد",
      description:
        "داوری، رسیدگی را از یک فرآیند چندمرحله‌ای و علنی به رسیدگی‌ای متمرکز، تخصصی و محرمانه تبدیل می‌کند؛ با رأیی که مانند حکم دادگاه لازم‌الاجراست.",
      primaryButtonText: "ثبت درخواست داوری",
      primaryButtonUrl: "/contact",
      secondaryButtonText: "مشاوره پیش از ثبت",
      secondaryButtonUrl: "/appointment",
      layout: "minimal",
    }, { background: "navy", spacing: "md" }),

    section("features", "نکات کلیدی", {
      columns: "3",
      items: [
        { icon: "clock", title: "مهلت قانونی رسیدگی", description: "سه ماه از شروع داوری", enabled: true },
        { icon: "lock", title: "جریان رسیدگی", description: "غیرعلنی و محرمانه", enabled: true },
        { icon: "check-circle", title: "اعتبار رأی", description: "لازم‌الاجرا برای طرفین", enabled: true },
      ],
    }, { background: "muted", spacing: "sm" }),

    section("timeline", "فرآیند رسیدگی", {
      eyebrow: "فرآیند رسیدگی",
      heading: "از ثبت درخواست تا صدور رأی",
      items: [
        { marker: "۰۱", title: "ثبت درخواست", description: "تماس با مؤسسه و ارائه قرارداد حاوی شرط داوری همراه با مستندات کلیدی.", enabled: true },
        { marker: "۰۲", title: "بررسی اولیه", description: "احراز صلاحیت مرجع داوری، بررسی اعتبار شرط داوری و قابلیت ارجاع موضوع.", enabled: true },
        { marker: "۰۳", title: "تعیین فرآیند رسیدگی", description: "توافق بر آیین رسیدگی، زبان، مهلت‌ها و تنظیم تقویم دادرسی با حضور طرفین.", enabled: true },
        { marker: "۰۴", title: "تعیین یا انتخاب داور", description: "پذیرش سمت از سوی داور و امضای اظهارنامه استقلال و بی‌طرفی.", enabled: true },
        { marker: "۰۵", title: "برگزاری جلسات", description: "استماع اظهارات طرفین به‌صورت حضوری یا آنلاین و تنظیم صورت‌جلسه رسیدگی.", enabled: true },
        { marker: "۰۶", title: "رسیدگی به ادعاها و دفاعیات", description: "بررسی ادله، ارجاع مسائل فنی و مالی به کارشناسی و تبادل لوایح تکمیلی.", enabled: true },
        { marker: "۰۷", title: "صدور رأی", description: "انشای رأی مستدل و مستند، تعیین تکلیف هزینه‌ها و ابلاغ رسمی به طرفین.", enabled: true },
      ],
    }, { background: "navy" }),

    section("rich-text", "داوری یا دادگاه؟", {
      eyebrow: "داوری یا دادگاه؟",
      heading: "تفاوت‌ها در یک نگاه",
      narrow: false,
      body: "هیچ‌کدام مطلقاً بهتر نیستند؛ انتخاب درست به ماهیت اختلاف، اهمیت محرمانگی و نیاز به سرعت بستگی دارد.\n\n### انتخاب مرجع رسیدگی\nدر داوری طرفین داور را انتخاب می‌کنند یا انتخاب او را به مؤسسه می‌سپارند؛ در دادگاه مرجع رسیدگی بر اساس قواعد صلاحیت تعیین می‌شود.\n\n### علنی بودن\nجلسات داوری غیرعلنی است و مستندات منتشر نمی‌شود؛ رسیدگی قضایی اصولاً علنی است.\n\n### آیین رسیدگی\nطرفین می‌توانند بر شیوه و مهلت‌های رسیدگی توافق کنند؛ در دادگاه آیین رسیدگی از پیش توسط قانون تعیین شده است.\n\n### مراحل\nداوری اصولاً یک‌مرحله‌ای است و ابطال رأی تنها در موارد محدود قانونی ممکن است؛ رسیدگی قضایی چندمرحله‌ای است، با امکان تجدیدنظر و در موارد معین فرجام.\n\n### تخصص مرجع\nدر داوری امکان انتخاب داور متخصص همان صنعت وجود دارد؛ در دادگاه تخصص موضوعی تضمین‌شده نیست.",
    }),

    section("cards", "مبانی قانونی", {
      eyebrow: "مبانی قانونی",
      heading: "داوری در حقوق ایران پایه قانونی روشنی دارد",
      description:
        "رسیدگی در مؤسسه دادآور بر پایه همین مقررات و در چارچوب توافق طرفین انجام می‌شود. مطالب این صفحه جنبه اطلاع‌رسانی عمومی دارد و جایگزین مشاوره حقوقی متناسب با پرونده شما نیست.",
      numbered: true,
      columns: "3",
      items: [
        { title: "ارجاع اختلاف به داوری", description: "باب هفتم قانون آیین دادرسی مدنی، مواد ۴۵۴ تا ۵۰۱؛ ناظر بر ارجاع اختلاف به داوری، تعیین داور، مهلت رسیدگی و موارد بطلان رأی.", enabled: true },
        { title: "موضوعات غیرقابل ارجاع", description: "ماده ۴۹۶ قانون آیین دادرسی مدنی؛ دعاوی ورشکستگی و نیز اصل نکاح، طلاق، فسخ نکاح و نسب قابل ارجاع به داوری نیستند.", enabled: true },
        { title: "اجرای رأی داوری", description: "ماده ۴۸۸ قانون آیین دادرسی مدنی؛ در صورت خودداری محکومٌ‌علیه از اجرای رأی، دادگاه صالح به درخواست ذی‌نفع اجراییه صادر می‌کند.", enabled: true },
      ],
    }, { background: "muted" }),

    section("faq", "پرسش‌های متداول", {
      eyebrow: "پرسش‌های متداول",
      heading: "درباره داوری بیشتر بدانید",
      description:
        "پاسخ به پرتکرارترین پرسش‌های متقاضیان درباره فرآیند، هزینه و اعتبار رأی داوری.",
      limit: 8,
      topic: "arbitration",
      linkText: "همه پرسش‌ها",
      linkUrl: "/faq",
    }),

    section("cta", "فراخوان پایانی", {
      eyebrow: "گام بعدی",
      heading: "آماده ثبت درخواست داوری هستید؟",
      description:
        "قرارداد حاوی شرط داوری و مستندات کلیدی را بارگذاری کنید؛ پس از بررسی مقدماتی صلاحیت، مراحل بعدی به شما اعلام می‌شود.",
      primaryButtonText: "ثبت درخواست",
      primaryButtonUrl: "/contact",
      secondaryButtonText: "رزرو وقت مشاوره",
      secondaryButtonUrl: "/appointment",
    }, { background: "navy" }),
  ],
});

/* -------------------------------------------------------------------------- */
/*  Legal documents                                                           */
/* -------------------------------------------------------------------------- */

const PRIVACY = page({
  id: "page-privacy",
  slug: "privacy",
  title: "سیاست حفظ حریم خصوصی",
  excerpt:
    "چه اطلاعاتی جمع‌آوری می‌شود، چگونه از آن محافظت می‌کنیم و شما چه حقوقی نسبت به آن دارید.",
  status: "published",
  publishedAt: SEED_TIME,
  showInNav: false,
  order: 90,
  system: false,
  seo: {
    metaTitle: "سیاست حفظ حریم خصوصی",
    metaDescription:
      "نحوه جمع‌آوری، استفاده، نگهداری و حفاظت از اطلاعات شخصی و مدارک ارسالی کاربران در وب‌سایت مؤسسه داوری دادآور.",
  },
  sections: [
    section("hero", "سربرگ صفحه", {
      eyebrow: "اسناد حقوقی",
      heading: "سیاست حفظ حریم خصوصی",
      description:
        "این سند توضیح می‌دهد چه اطلاعاتی از شما جمع‌آوری می‌شود، چگونه از آن محافظت می‌کنیم و شما چه حقوقی نسبت به آن دارید.",
      layout: "minimal",
    }, { background: "muted", spacing: "md" }),

    section("rich-text", "متن سند", {
      body: LEGAL_PAGE_BODIES.privacy,
      narrow: true,
    }),
  ],
});

const TERMS = page({
  id: "page-terms",
  slug: "terms",
  title: "شرایط و قوانین",
  excerpt: "شرایط استفاده از وب‌سایت، محدوده خدمات و مسئولیت‌های طرفین.",
  status: "published",
  publishedAt: SEED_TIME,
  showInNav: false,
  order: 91,
  system: false,
  seo: {
    metaTitle: "شرایط و قوانین",
    metaDescription:
      "شرایط استفاده از وب‌سایت مؤسسه داوری دادآور، محدوده خدمات، مسئولیت‌ها، مالکیت فکری و قوانین ثبت درخواست و رزرو وقت.",
  },
  sections: [
    section("hero", "سربرگ صفحه", {
      eyebrow: "اسناد حقوقی",
      heading: "شرایط و قوانین استفاده",
      description: "شرایط استفاده از وب‌سایت، محدوده خدمات و مسئولیت‌های طرفین.",
      layout: "minimal",
    }, { background: "muted", spacing: "md" }),

    section("rich-text", "متن سند", {
      body: LEGAL_PAGE_BODIES.terms,
      narrow: true,
    }),
  ],
});

/* -------------------------------------------------------------------------- */
/*  System pages — hand-built routes with editable copy                       */
/* -------------------------------------------------------------------------- */

/**
 * A system page supplies the heading, lead and SEO of a route that also does
 * something a section cannot: filter an archive, run a booking wizard, look up
 * a tracking code. Extra sections added here render *below* that machinery.
 */
function systemPage(input: {
  id: string;
  slug: string;
  title: string;
  heading: string;
  lead: string;
  eyebrow: string;
  note: string;
  order: number;
  metaTitle: string;
  metaDescription: string;
  extra?: PageSection[];
}): Page {
  return page({
    id: input.id,
    slug: input.slug,
    title: input.title,
    excerpt: input.lead,
    status: "published",
    publishedAt: SEED_TIME,
    showInNav: true,
    order: input.order,
    system: true,
    systemNote: input.note,
    seo: {
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    },
    sections: [
      section("hero", "سربرگ صفحه", {
        eyebrow: input.eyebrow,
        heading: input.heading,
        description: input.lead,
        layout: "minimal",
      }, { background: "muted", spacing: "md" }),
      ...(input.extra ?? []),
    ],
  });
}

const SYSTEM_PAGES: Page[] = [
  systemPage({
    id: "page-arbitrator",
    slug: "arbitrator",
    title: "درباره داور",
    eyebrow: "داور مؤسسه",
    heading: "داور مؤسسه",
    lead: "معرفی، سوابق حرفه‌ای، تخصص‌ها و حوزه‌های فعالیت داور مؤسسه.",
    note: "این صفحه پروفایل داور را از بخش «داوران و اعضا» می‌خواند؛ محتوای پروفایل را از همان بخش ویرایش کنید.",
    order: 4,
    metaTitle: "درباره داور مؤسسه",
    metaDescription:
      "معرفی داور مؤسسه داوری دادآور؛ سوابق حرفه‌ای، تخصص‌ها، حوزه‌های فعالیت و رویکرد حرفه‌ای در رسیدگی به اختلافات.",
  }),
  systemPage({
    id: "page-articles",
    slug: "articles",
    title: "مقالات",
    eyebrow: "مرکز دانش",
    heading: "تحلیل‌ها و یادداشت‌های حقوقی",
    lead: "مطالبی درباره داوری، قراردادها و حل‌وفصل اختلافات، با زبانی که برای غیرحقوق‌دان هم قابل استفاده باشد.",
    note: "فهرست و فیلتر مقالات خودکار است. عنوان، توضیح و سئوی صفحه بایگانی از همین‌جا ویرایش می‌شود.",
    order: 5,
    metaTitle: "مقالات و تحلیل‌های حقوقی",
    metaDescription:
      "مقالات تخصصی درباره داوری، حقوق تجارت، قراردادها و حل‌وفصل اختلافات؛ نوشته‌شده توسط کارشناسان مؤسسه داوری دادآور.",
  }),
  systemPage({
    id: "page-faq",
    slug: "faq",
    title: "پرسش‌های متداول",
    eyebrow: "پرسش‌های متداول",
    heading: "پاسخ پرسش‌های پرتکرار",
    lead: "پیش از ثبت درخواست، پاسخ پرتکرارترین پرسش‌ها درباره فرآیند، هزینه و اعتبار رأی داوری را ببینید.",
    note: "پرسش‌ها از بخش «پرسش‌های متداول» خوانده می‌شوند و همان‌جا قابل افزودن، ویرایش و مرتب‌سازی‌اند.",
    order: 6,
    metaTitle: "پرسش‌های متداول",
    metaDescription:
      "پاسخ پرسش‌های متداول درباره داوری، فرآیند رسیدگی، هزینه‌ها و نحوه ثبت درخواست در مؤسسه داوری دادآور.",
  }),
  systemPage({
    id: "page-contact",
    slug: "contact",
    title: "تماس با ما",
    eyebrow: "ارتباط با ما",
    heading: "با ما در تماس باشید",
    lead: "برای طرح پرسش، هماهنگی جلسه یا ارسال پیام، از فرم زیر یا اطلاعات تماس مؤسسه استفاده کنید.",
    note: "نشانی، شماره‌ها، ایمیل، ساعات کاری و نقشه از «تنظیمات سایت» خوانده می‌شوند. پیام‌های ارسالی در بخش «فرم‌ها» ثبت می‌شود.",
    order: 7,
    metaTitle: "تماس با ما",
    metaDescription:
      "اطلاعات تماس مؤسسه داوری دادآور؛ نشانی، شماره تماس، ایمیل، ساعات کاری و فرم ارسال پیام.",
  }),
  systemPage({
    id: "page-appointment",
    slug: "appointment",
    title: "رزرو وقت",
    eyebrow: "رزرو وقت",
    heading: "رزرو وقت مشاوره",
    lead: "نوع جلسه، تاریخ و ساعت را انتخاب کنید؛ پس از تأیید، جزئیات جلسه برای شما ارسال می‌شود.",
    note: "زمان‌های در دسترس از «تنظیمات نوبت‌دهی» محاسبه می‌شوند. رزروها در بخش «نوبت‌ها» مدیریت می‌شوند.",
    order: 9,
    metaTitle: "رزرو وقت مشاوره",
    metaDescription:
      "رزرو آنلاین وقت مشاوره حقوقی و جلسه داوری؛ انتخاب نوع جلسه، تاریخ، ساعت و شیوه برگزاری.",
  }),
  systemPage({
    id: "page-tracking",
    slug: "tracking",
    title: "پیگیری درخواست",
    eyebrow: "پیگیری",
    heading: "پیگیری وضعیت درخواست",
    lead: "کد پیگیری و شماره موبایلی که با آن درخواست ثبت شده است را وارد کنید.",
    note: "این صفحه با کد پیگیری و شماره موبایل، وضعیت پرونده را نمایش می‌دهد.",
    order: 10,
    metaTitle: "پیگیری درخواست",
    metaDescription:
      "پیگیری وضعیت درخواست مشاوره یا رزرو وقت با کد پیگیری و شماره موبایل ثبت‌شده.",
  }),
];

/* -------------------------------------------------------------------------- */

export const SEED_PAGES: Page[] = [
  HOME,
  ABOUT,
  ARBITRATION,
  ...SYSTEM_PAGES,
  PRIVACY,
  TERMS,
];
