import type {
  Appointment,
  ConsultationRequest,
  ContactMessage,
  User,
} from "@/types";
import {
  PRINCIPAL_ARBITRATOR_ID,
  PRINCIPAL_ARBITRATOR_NAME,
} from "./arbitrators";

/**
 * Demonstration records for the admin dashboard.
 *
 * ⚠️ PLACEHOLDER DATA, ADMIN-ONLY. These are invented enquiries whose sole
 * purpose is to make the (authenticated, noindexed) dashboard navigable before
 * real traffic arrives. They are **not** clients, testimonials or case
 * history, and nothing here is rendered on the public site. Dates are
 * generated *relative to first boot* so the dashboard shows a believable mix
 * of today's, upcoming and past activity instead of a frozen snapshot.
 *
 * Every appointment is assigned to the institution's single arbitrator; no
 * other arbitrator is named anywhere in this file. Delete this module (and its
 * call in `src/data/index.ts`) to start with an empty database.
 */

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoStamp(offsetDays: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildSampleUsers(): User[] {
  return [
    {
      id: "usr-sample-1",
      fullName: "مهندس رضا کاویانی",
      email: "r.kaviani@example.com",
      phone: "09121110022",
      role: "client",
      status: "active",
      createdAt: isoStamp(-64, 11, 20),
      updatedAt: isoStamp(-6, 9, 10),
      lastLoginAt: isoStamp(-6, 9, 10),
    },
    {
      id: "usr-sample-2",
      fullName: "شرکت پترو صنعت آریا",
      email: "legal@petro-aria.example.com",
      phone: "02188776655",
      role: "client",
      status: "active",
      createdAt: isoStamp(-41, 14, 5),
      updatedAt: isoStamp(-3, 16, 40),
      lastLoginAt: isoStamp(-3, 16, 40),
    },
    {
      id: "usr-sample-3",
      fullName: "خانم مریم دلاور",
      email: "m.delavar@example.com",
      phone: "09354447788",
      role: "client",
      status: "pending",
      createdAt: isoStamp(-9, 18, 30),
      updatedAt: isoStamp(-9, 18, 30),
    },
    {
      id: "usr-sample-4",
      fullName: "آقای سیاوش نوری",
      email: "s.nouri@example.com",
      phone: "09127778811",
      role: "client",
      status: "active",
      createdAt: isoStamp(-22, 10, 0),
      updatedAt: isoStamp(-2, 11, 15),
      lastLoginAt: isoStamp(-2, 11, 15),
    },
    {
      id: "usr-sample-5",
      fullName: "گروه ساختمانی پایدار",
      email: "info@paydar-build.example.com",
      phone: "02166554433",
      role: "client",
      status: "suspended",
      createdAt: isoStamp(-120, 9, 45),
      updatedAt: isoStamp(-30, 12, 0),
    },
    {
      id: "usr-sample-6",
      fullName: "آقای فرید بهرامی",
      email: "f.bahrami@example.com",
      phone: "09193334455",
      role: "client",
      status: "active",
      createdAt: isoStamp(-1, 20, 10),
      updatedAt: isoStamp(-1, 20, 10),
    },
  ];
}

export function buildSampleAppointments(): Appointment[] {
  return [
    {
      id: "apt-sample-1",
      bookingCode: "RZ-7QM4TD",
      fullName: "مهندس رضا کاویانی",
      phone: "09121110022",
      email: "r.kaviani@example.com",
      consultationType: "specialised",
      consultationTypeLabel: "مشاوره تخصصی",
      arbitratorId: PRINCIPAL_ARBITRATOR_ID,
      arbitratorName: PRINCIPAL_ARBITRATOR_NAME,
      date: isoDay(0),
      time: "10:00",
      durationMinutes: 60,
      meetingMode: "in-person",
      subject: "اختلاف در تعدیل قیمت قرارداد پیمانکاری",
      status: "confirmed",
      consentAccepted: true,
      timeline: [
        { status: "pending", at: isoStamp(-5, 13, 12), note: "ثبت رزرو از طریق وب‌سایت" },
        { status: "confirmed", at: isoStamp(-4, 9, 30), byName: "مدیر سیستم" },
      ],
      notes: [],
      createdAt: isoStamp(-5, 13, 12),
      updatedAt: isoStamp(-4, 9, 30),
    },
    {
      id: "apt-sample-2",
      bookingCode: "RZ-3XK9PB",
      fullName: "خانم مریم دلاور",
      phone: "09354447788",
      consultationType: "initial",
      consultationTypeLabel: "مشاوره اولیه",
      arbitratorId: PRINCIPAL_ARBITRATOR_ID,
      arbitratorName: PRINCIPAL_ARBITRATOR_NAME,
      date: isoDay(0),
      time: "15:30",
      durationMinutes: 30,
      meetingMode: "online",
      subject: "امکان‌سنجی میانجی‌گری در اختلاف شرکا",
      status: "pending",
      consentAccepted: true,
      timeline: [{ status: "pending", at: isoStamp(-1, 18, 40) }],
      notes: [],
      createdAt: isoStamp(-1, 18, 40),
      updatedAt: isoStamp(-1, 18, 40),
    },
    {
      id: "apt-sample-3",
      bookingCode: "RZ-5NW2HC",
      fullName: "شرکت پترو صنعت آریا",
      phone: "02188776655",
      email: "legal@petro-aria.example.com",
      consultationType: "arbitration-session",
      consultationTypeLabel: "جلسه داوری",
      arbitratorId: PRINCIPAL_ARBITRATOR_ID,
      arbitratorName: PRINCIPAL_ARBITRATOR_NAME,
      date: isoDay(2),
      time: "11:00",
      durationMinutes: 90,
      meetingMode: "in-person",
      subject: "جلسه نخست رسیدگی داوری – پرونده تأمین تجهیزات",
      status: "confirmed",
      consentAccepted: true,
      timeline: [
        { status: "pending", at: isoStamp(-8, 10, 5) },
        { status: "confirmed", at: isoStamp(-7, 11, 20), byName: "مدیر سیستم" },
      ],
      notes: [],
      createdAt: isoStamp(-8, 10, 5),
      updatedAt: isoStamp(-7, 11, 20),
    },
    {
      id: "apt-sample-4",
      bookingCode: "RZ-9TB6KQ",
      fullName: "آقای سیاوش نوری",
      phone: "09127778811",
      consultationType: "contract-review",
      consultationTypeLabel: "بررسی قرارداد",
      arbitratorId: PRINCIPAL_ARBITRATOR_ID,
      arbitratorName: PRINCIPAL_ARBITRATOR_NAME,
      date: isoDay(4),
      time: "13:00",
      durationMinutes: 45,
      meetingMode: "phone",
      subject: "بازبینی قرارداد سهامداران پیش از ورود سرمایه‌گذار",
      status: "pending",
      consentAccepted: true,
      timeline: [{ status: "pending", at: isoStamp(-2, 9, 25) }],
      notes: [],
      createdAt: isoStamp(-2, 9, 25),
      updatedAt: isoStamp(-2, 9, 25),
    },
    {
      id: "apt-sample-5",
      bookingCode: "RZ-2HD8LM",
      fullName: "آقای فرید بهرامی",
      phone: "09193334455",
      consultationType: "initial",
      consultationTypeLabel: "مشاوره اولیه",
      arbitratorId: PRINCIPAL_ARBITRATOR_ID,
      arbitratorName: PRINCIPAL_ARBITRATOR_NAME,
      date: isoDay(-6),
      time: "09:30",
      durationMinutes: 30,
      meetingMode: "online",
      subject: "مطالبه ضمانت‌نامه بانکی",
      status: "completed",
      consentAccepted: true,
      timeline: [
        { status: "pending", at: isoStamp(-11, 15, 0) },
        { status: "confirmed", at: isoStamp(-10, 10, 0), byName: "مدیر سیستم" },
        { status: "completed", at: isoStamp(-6, 10, 5), byName: "مدیر سیستم" },
      ],
      notes: [],
      createdAt: isoStamp(-11, 15, 0),
      updatedAt: isoStamp(-6, 10, 5),
    },
    {
      id: "apt-sample-6",
      bookingCode: "RZ-6CV1RJ",
      fullName: "گروه ساختمانی پایدار",
      phone: "02166554433",
      consultationType: "specialised",
      consultationTypeLabel: "مشاوره تخصصی",
      arbitratorId: PRINCIPAL_ARBITRATOR_ID,
      arbitratorName: PRINCIPAL_ARBITRATOR_NAME,
      date: isoDay(-13),
      time: "16:00",
      durationMinutes: 60,
      meetingMode: "in-person",
      subject: "ادعای تأخیر در پروژه مسکونی",
      status: "cancelled",
      consentAccepted: true,
      timeline: [
        { status: "pending", at: isoStamp(-18, 12, 0) },
        { status: "confirmed", at: isoStamp(-17, 9, 0), byName: "مدیر سیستم" },
        {
          status: "cancelled",
          at: isoStamp(-14, 17, 30),
          note: "لغو به درخواست متقاضی",
          byName: "مدیر سیستم",
        },
      ],
      notes: [],
      createdAt: isoStamp(-18, 12, 0),
      updatedAt: isoStamp(-14, 17, 30),
    },
    {
      id: "apt-sample-7",
      bookingCode: "RZ-4PL7GN",
      fullName: "خانم نگار شریفی",
      phone: "09122223344",
      consultationType: "initial",
      consultationTypeLabel: "مشاوره اولیه",
      arbitratorId: PRINCIPAL_ARBITRATOR_ID,
      arbitratorName: PRINCIPAL_ARBITRATOR_NAME,
      date: isoDay(7),
      time: "14:30",
      durationMinutes: 30,
      meetingMode: "online",
      subject: "بررسی شرط داوری در قرارداد نمایندگی",
      status: "confirmed",
      consentAccepted: true,
      timeline: [
        { status: "pending", at: isoStamp(-3, 20, 15) },
        { status: "confirmed", at: isoStamp(-3, 21, 0), byName: "مدیر سیستم" },
      ],
      notes: [],
      createdAt: isoStamp(-3, 20, 15),
      updatedAt: isoStamp(-3, 21, 0),
    },
  ];
}

export function buildSampleRequests(): ConsultationRequest[] {
  return [
    {
      id: "req-sample-1",
      trackingCode: "DR-8KQ3MT",
      fullName: "مهندس رضا کاویانی",
      phone: "09121110022",
      email: "r.kaviani@example.com",
      requestType: "arbitration",
      legalArea: "پیمانکاری و ساخت",
      subject: "درخواست داوری اختلاف تعدیل قیمت",
      description:
        "قرارداد پیمانکاری منعقده در سال گذشته دارای شرط داوری است. کارفرما از پرداخت مابه‌التفاوت تعدیل خودداری می‌کند و مکاتبات ما بی‌پاسخ مانده است. درخواست ارجاع موضوع به داوری مؤسسه را دارم.",
      preferredContact: "phone",
      preferredWindow: "morning",
      attachments: [],
      status: "in-review",
      consentAccepted: true,
      assignedArbitratorId: PRINCIPAL_ARBITRATOR_ID,
      timeline: [
        { status: "submitted", at: isoStamp(-6, 11, 45) },
        { status: "in-review", at: isoStamp(-5, 9, 15), byName: "مدیر سیستم" },
      ],
      notes: [
        {
          id: "note-1",
          authorId: "usr-admin",
          authorName: "مدیر سیستم",
          body: "شرط داوری قرارداد بررسی شد؛ صلاحیت مؤسسه محرز است. نیازمند بررسی فنی مستندات پیش از تعیین جلسه.",
          createdAt: isoStamp(-5, 9, 20),
        },
      ],
      createdAt: isoStamp(-6, 11, 45),
      updatedAt: isoStamp(-5, 9, 20),
    },
    {
      id: "req-sample-2",
      trackingCode: "DR-2WH9XR",
      fullName: "شرکت پترو صنعت آریا",
      phone: "02188776655",
      email: "legal@petro-aria.example.com",
      requestType: "consultation",
      legalArea: "بازرگانی خارجی و گمرک",
      subject: "مشاوره درباره قانون حاکم بر قرارداد تأمین",
      description:
        "در حال مذاکره برای قرارداد تأمین تجهیزات با یک شرکت خارجی هستیم. درباره تعیین قانون حاکم و مقر داوری نیاز به مشاوره تخصصی داریم.",
      preferredContact: "email",
      preferredWindow: "afternoon",
      attachments: [],
      status: "scheduled",
      consentAccepted: true,
      assignedArbitratorId: PRINCIPAL_ARBITRATOR_ID,
      timeline: [
        { status: "submitted", at: isoStamp(-10, 14, 0) },
        { status: "in-review", at: isoStamp(-9, 10, 0), byName: "مدیر سیستم" },
        { status: "approved", at: isoStamp(-8, 12, 30), byName: "مدیر سیستم" },
        {
          status: "scheduled",
          at: isoStamp(-7, 11, 25),
          note: "جلسه در تاریخ تعیین‌شده هماهنگ شد.",
          byName: "مدیر سیستم",
        },
      ],
      notes: [],
      createdAt: isoStamp(-10, 14, 0),
      updatedAt: isoStamp(-7, 11, 25),
    },
    {
      id: "req-sample-3",
      trackingCode: "DR-6MT4BW",
      fullName: "خانم مریم دلاور",
      phone: "09354447788",
      requestType: "mediation",
      legalArea: "دعاوی شرکت‌ها",
      subject: "اختلاف با شریک بر سر تقسیم سود",
      description:
        "با شریک خود در یک شرکت با مسئولیت محدود بر سر نحوه تقسیم سود اختلاف داریم. ترجیح می‌دهیم موضوع بدون طرح دعوا حل شود.",
      preferredContact: "whatsapp",
      preferredWindow: "evening",
      attachments: [],
      status: "needs-info",
      consentAccepted: true,
      timeline: [
        { status: "submitted", at: isoStamp(-4, 19, 10) },
        { status: "in-review", at: isoStamp(-3, 10, 0), byName: "مدیر سیستم" },
        {
          status: "needs-info",
          at: isoStamp(-3, 10, 40),
          note: "ارائه اساسنامه شرکت و صورت‌جلسه آخرین مجمع لازم است.",
          byName: "مدیر سیستم",
        },
      ],
      notes: [],
      createdAt: isoStamp(-4, 19, 10),
      updatedAt: isoStamp(-3, 10, 40),
    },
    {
      id: "req-sample-4",
      trackingCode: "DR-9RJ7VC",
      fullName: "آقای فرید بهرامی",
      phone: "09193334455",
      requestType: "contract-review",
      legalArea: "قراردادهای تجاری",
      subject: "بازبینی قرارداد توزیع پیش از امضا",
      description:
        "پیش‌نویس قرارداد توزیع انحصاری دریافت کرده‌ام و پیش از امضا نیاز به بررسی حقوقی دارم؛ به‌ویژه بندهای فسخ و عدم رقابت.",
      preferredContact: "phone",
      preferredWindow: "morning",
      attachments: [],
      status: "submitted",
      consentAccepted: true,
      timeline: [{ status: "submitted", at: isoStamp(0, 8, 55) }],
      notes: [],
      createdAt: isoStamp(0, 8, 55),
      updatedAt: isoStamp(0, 8, 55),
    },
    {
      id: "req-sample-5",
      trackingCode: "DR-3BN5FK",
      fullName: "آقای سیاوش نوری",
      phone: "09127778811",
      requestType: "representation",
      legalArea: "مالکیت فکری",
      subject: "دعوای نقض علامت تجاری",
      description:
        "علامت تجاری ثبت‌شده ما توسط یک واحد صنفی دیگر مورد استفاده قرار گرفته است. خواهان طرح دعوا هستیم.",
      preferredContact: "in-person",
      preferredWindow: "afternoon",
      attachments: [],
      status: "completed",
      consentAccepted: true,
      timeline: [
        { status: "submitted", at: isoStamp(-28, 13, 0) },
        { status: "in-review", at: isoStamp(-27, 9, 0), byName: "مدیر سیستم" },
        { status: "approved", at: isoStamp(-25, 11, 0), byName: "مدیر سیستم" },
        { status: "completed", at: isoStamp(-12, 15, 30), byName: "مدیر سیستم" },
      ],
      notes: [],
      createdAt: isoStamp(-28, 13, 0),
      updatedAt: isoStamp(-12, 15, 30),
    },
  ];
}

export function buildSampleMessages(): ContactMessage[] {
  return [
    {
      id: "msg-sample-1",
      fullName: "خانم نگار شریفی",
      phone: "09122223344",
      email: "n.sharifi@example.com",
      subject: "پرسش درباره هزینه داوری",
      message:
        "سلام. برای اختلافی به ارزش تقریبی دو میلیارد تومان، هزینه داوری در مؤسسه شما چگونه محاسبه می‌شود؟",
      status: "new",
      notes: [],
      createdAt: isoStamp(0, 9, 40),
      updatedAt: isoStamp(0, 9, 40),
    },
    {
      id: "msg-sample-2",
      fullName: "آقای حامد رستگار",
      phone: "09361112233",
      subject: "درخواست همکاری",
      message:
        "با سلام، وکیل پایه‌یک دادگستری با ده سال سابقه در حوزه قراردادهای تجاری هستم و مایل به همکاری با مجموعه شما می‌باشم.",
      status: "in-progress",
      notes: [],
      createdAt: isoStamp(-2, 16, 20),
      updatedAt: isoStamp(-1, 10, 0),
    },
    {
      id: "msg-sample-3",
      fullName: "شرکت آسمان تجارت",
      phone: "02144332211",
      email: "info@aseman-t.example.com",
      subject: "امکان برگزاری جلسه آنلاین",
      message:
        "دفتر ما در شیراز است. آیا امکان برگزاری جلسات داوری به‌صورت کاملاً آنلاین وجود دارد؟",
      status: "completed",
      notes: [],
      createdAt: isoStamp(-8, 11, 5),
      updatedAt: isoStamp(-7, 9, 30),
    },
  ];
}
