"use client";

import {
  useActionState,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import type {
  AppointmentSettings,
  Arbitrator,
  MeetingMode,
  TimeSlot,
} from "@/types";
import { fetchAvailableSlots, submitAppointment } from "@/lib/actions/public";
import {
  idleState,
  type AppointmentReceipt,
  type FormState,
} from "@/lib/actions/types";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import {
  MEETING_MODE,
  WEEKDAYS,
  resolveConsultationType,
} from "@/lib/config/labels";
import { ROUTES } from "@/lib/config/routes";
import { PhoneChallenge } from "./phone-verification";
import {
  bookingHorizonIso,
  bookingStartIso,
  isClosedDay,
} from "@/lib/services/scheduling";
import { cn } from "@/lib/utils/cn";
import { formatJalaliLong, toISODateString } from "@/lib/utils/jalali";
import { digitsOnly, fa, faPhone } from "@/lib/utils/persian";
import { ArbitratorRow } from "@/components/cards/arbitrator-card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, RadioCard, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert, EmptyState, LoadingState } from "@/components/ui/states";
import { JalaliCalendar } from "./jalali-calendar";
import { Receipt } from "./receipt";
import { Stepper, type StepDefinition } from "./stepper";

const STEPS: StepDefinition[] = [
  { id: "type", label: "نوع مشاوره" },
  { id: "arbitrator", label: "داور" },
  { id: "date", label: "تاریخ" },
  { id: "time", label: "ساعت" },
  { id: "details", label: "اطلاعات شما" },
  { id: "mode", label: "نوع جلسه" },
  { id: "confirm", label: "تأیید نهایی" },
];

interface WizardState {
  consultationType: string;
  arbitratorId: string;
  date: string;
  time: string;
  fullName: string;
  phone: string;
  email: string;
  subject: string;
  meetingMode: MeetingMode | "";
  consent: boolean;
}

const EMPTY: WizardState = {
  consultationType: "",
  arbitratorId: "",
  date: "",
  time: "",
  fullName: "",
  phone: "",
  email: "",
  subject: "",
  meetingMode: "",
  consent: false,
};

/**
 * Seven-step appointment booking wizard.
 *
 * Notes on the design:
 *  • Availability is fetched from the server whenever the arbitrator or date
 *    changes, and re-validated inside the submit action — the client list can
 *    always be stale, and two visitors can race for the same slot.
 *  • Visible controls are React-controlled and *unnamed*; one hidden block at
 *    the bottom carries the canonical values into the Server Action, so each
 *    field is submitted exactly once regardless of which step is mounted.
 *  • The wizard needs JavaScript. A `<noscript>` block routes visitors to the
 *    plain request form and the phone number instead of leaving them stuck.
 */
export function AppointmentWizard({
  arbitrators,
  /** Booking rules and meeting types, from `settings.appointments`. */
  settings,
  csrfToken,
  phone,
  preselectedArbitratorId,
  requirePhoneVerification = false,
}: {
  arbitrators: Arbitrator[];
  settings: AppointmentSettings;
  csrfToken: string;
  phone: string;
  preselectedArbitratorId?: string;
  /** Mirrors `settings.sms.requirePhoneVerification`; enforced server-side too. */
  requirePhoneVerification?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    FormState<AppointmentReceipt>,
    FormData
  >(submitAppointment, idleState as FormState<AppointmentReceipt>);

  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneProof, setPhoneProof] = useState("");

  // Stable identity: `PhoneChallenge` drives an effect off this callback.
  const handleProof = useCallback((value: string) => setPhoneProof(value), []);
  const [data, setData] = useState<WizardState>(() => {
    const bookable = arbitrators.filter((a) => a.bookable);
    return {
      ...EMPTY,
      // With a single arbitrator there is nothing to choose: preselect them so
      // the step confirms who will hear the matter instead of presenting a
      // one-option "picker".
      arbitratorId:
        preselectedArbitratorId &&
        arbitrators.some((a) => a.id === preselectedArbitratorId)
          ? preselectedArbitratorId
          : bookable.length === 1
            ? bookable[0].id
            : "",
    };
  });

  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [loadingSlots, startSlotTransition] = useTransition();

  const topRef = useRef<HTMLDivElement>(null);

  /**
   * Booking window and closed days come from the CMS, so the calendar the
   * visitor sees is the same one the server will validate against.
   */
  const minIso = useMemo(() => bookingStartIso(settings), [settings]);
  const maxIso = useMemo(() => bookingHorizonIso(settings), [settings]);
  const isDayClosed = useCallback(
    (iso: string) => isClosedDay(iso, settings),
    [settings],
  );

  /**
   * A human sentence describing the open days, built from the configured
   * week — so changing Thursday's hours in the admin changes what the visitor
   * is told, instead of leaving a stale claim on the page.
   */
  const workingWeekLabel = useMemo(() => {
    const open = settings.days
      .filter((day) => day.enabled)
      .map((day) => `${WEEKDAYS[day.day]} ${fa(day.start)} تا ${fa(day.end)}`);

    if (!open.length) return "در حال حاضر روز کاری فعالی تعریف نشده است.";
    return `${open.join("، ")}. سایر روزها تعطیل است.`;
  }, [settings.days]);

  const meetingTypes = useMemo(
    () =>
      settings.types
        .filter((type) => type.enabled)
        .sort((a, b) => a.order - b.order),
    [settings.types],
  );

  const selectedType = data.consultationType
    ? resolveConsultationType(data.consultationType, settings.types)
    : null;

  const selectedArbitrator = arbitrators.find((a) => a.id === data.arbitratorId);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  /* -- availability ---------------------------------------------------- */
  const loadSlots = useCallback((arbitratorId: string, date: string) => {
    setSlotError(null);
    setSlots(null);
    startSlotTransition(async () => {
      try {
        const result = await fetchAvailableSlots(arbitratorId, date);
        setSlots(result);
      } catch {
        setSlotError(
          "دریافت ساعت‌های خالی با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
        );
      }
    });
  }, []);

  /**
   * Availability is refreshed from the two events that can invalidate it —
   * choosing an arbitrator and choosing a date — rather than from an effect
   * watching those values. Same result, but the fetch is tied to the user
   * action that caused it instead of to a render.
   */
  const selectArbitrator = (arbitratorId: string) => {
    set("arbitratorId", arbitratorId);
    if (data.date) loadSlots(arbitratorId, data.date);
  };

  const selectDate = (iso: string) => {
    set("date", iso);
    set("time", "");
    if (data.arbitratorId) loadSlots(data.arbitratorId, iso);
  };

  /* -- step validation -------------------------------------------------- */
  const validateStep = (index: number): boolean => {
    const next: Record<string, string> = {};

    if (index === 0 && !data.consultationType) {
      next.consultationType = "لطفاً نوع مشاوره را انتخاب کنید.";
    }

    if (index === 1 && !data.arbitratorId) {
      next.arbitratorId = "لطفاً داور مورد نظر را انتخاب کنید.";
    }

    if (index === 2 && !data.date) {
      next.date = "لطفاً تاریخ جلسه را انتخاب کنید.";
    }

    if (index === 3 && !data.time) {
      next.time = "لطفاً یکی از ساعت‌های خالی را انتخاب کنید.";
    }

    if (index === 4) {
      if (data.fullName.trim().length < 3) {
        next.fullName = "نام و نام خانوادگی را کامل وارد کنید.";
      }
      if (!/^09\d{9}$/.test(digitsOnly(data.phone))) {
        next.phone = "شماره موبایل معتبر نیست. نمونه صحیح: ۰۹۱۲۳۴۵۶۷۸۹";
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        next.email = "نشانی ایمیل معتبر نیست.";
      }
      if (data.subject.trim().length < 5) {
        next.subject = "موضوع جلسه را در یک جمله کوتاه بنویسید.";
      }
      /**
       * Stop here rather than at submit: the visitor is six steps in, and a
       * server-side rejection at the end would be a poor place to discover the
       * number was never verified. The action re-checks regardless.
       */
      if (requirePhoneVerification && !phoneProof) {
        next.phone = "برای ادامه، شماره موبایل خود را تأیید کنید.";
      }
    }

    if (index === 5 && !data.meetingMode) {
      next.meetingMode = "لطفاً نوع برگزاری جلسه را انتخاب کنید.";
    }

    if (index === 6 && !data.consent) {
      next.consent = "برای ثبت رزرو، پذیرش شرایط الزامی است.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setFurthest((f) => Math.max(f, next));
    scrollToTop();
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    scrollToTop();
  };

  const jumpTo = (index: number) => {
    if (index > furthest) return;
    setErrors({});
    setStep(index);
    scrollToTop();
  };

  /* -- success ---------------------------------------------------------- */
  if (state.status === "success" && state.payload) {
    const receipt = state.payload;

    return (
      <Receipt
        title="رزرو شما ثبت شد"
        description="پس از بررسی و تأیید نهایی، جزئیات جلسه از طریق تماس یا پیامک به شما اعلام می‌شود."
        code={receipt.bookingCode}
        codeLabel="کد رزرو شما"
        rows={[
          { label: "تاریخ جلسه", value: formatJalaliLong(receipt.date) },
          { label: "ساعت", value: fa(receipt.time) },
          {
            label: "مدت جلسه",
            value: `${fa(receipt.durationMinutes)} دقیقه`,
          },
          {
            label: "نوع جلسه",
            value:
              resolveConsultationType(receipt.consultationType, settings.types)
                ?.title ?? receipt.consultationType,
          },
          {
            label: "نحوه برگزاری",
            value: MEETING_MODE[receipt.meetingMode].label,
          },
          { label: "داور", value: receipt.arbitratorName },
          { label: "وضعیت رزرو", value: "در انتظار تأیید" },
        ]}
      />
    );
  }

  const bookableArbitrators = arbitrators.filter((a) => a.bookable);
  const singleArbitrator = bookableArbitrators.length === 1;

  /* -- render ------------------------------------------------------------ */
  return (
    <div ref={topRef} className="scroll-mt-32">
      <noscript>
        <div className="mb-8 rounded-sm border border-warning/25 bg-warning-soft px-5 py-4 text-[0.875rem] leading-[2] text-warning">
          برای استفاده از فرم رزرو آنلاین، جاوااسکریپت باید فعال باشد. می‌توانید از
          طریق <a href={ROUTES.contact}>فرم تماس</a> اقدام کنید یا با شماره{" "}
          <span dir="ltr">{faPhone(phone)}</span> تماس بگیرید.
        </div>
      </noscript>

      <div className="surface p-5 sm:p-7 lg:p-9">
        <Stepper
          steps={STEPS}
          current={step}
          furthest={furthest}
          onSelect={jumpTo}
        />

        <hr className="hairline my-7 lg:my-9" />

        {state.status === "error" && (
          <Alert tone="danger" title="ثبت رزرو انجام نشد" className="mb-7">
            {state.message}
          </Alert>
        )}

        <form action={formAction} noValidate>
          {/* canonical values */}
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="consultationType" value={data.consultationType} />
          <input type="hidden" name="arbitratorId" value={data.arbitratorId} />
          <input type="hidden" name="date" value={data.date} />
          <input type="hidden" name="time" value={data.time} />
          <input type="hidden" name="meetingMode" value={data.meetingMode} />
          <input type="hidden" name="fullName" value={data.fullName} />
          <input type="hidden" name="phone" value={data.phone} />
          <input type="hidden" name="phoneProof" value={phoneProof} />
          <input type="hidden" name="email" value={data.email} />
          <input type="hidden" name="subject" value={data.subject} />
          <input type="hidden" name="consent" value={data.consent ? "true" : ""} />

          {/* ---- step 1: consultation type ----------------------------- */}
          {step === 0 && (
            <StepPanel
              title="چه نوع مشاوره‌ای نیاز دارید؟"
              description="نوع جلسه، مدت و ترکیب تیم رسیدگی‌کننده را تعیین می‌کند."
              error={errors.consultationType}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {meetingTypes.map((type) => (
                  <RadioCard
                    key={type.value}
                    name="consultationType-ui"
                    checked={data.consultationType === type.value}
                    onChange={() => set("consultationType", type.value)}
                    option={{
                      value: type.value,
                      title: type.title,
                      description: type.description,
                      meta: `${fa(type.durationMinutes)} دقیقه`,
                    }}
                  />
                ))}
              </div>
            </StepPanel>
          )}

          {/* ---- step 2: arbitrator ------------------------------------ */}
          {step === 1 && (
            <StepPanel
              title={
                singleArbitrator
                  ? "جلسه با داور مؤسسه برگزار می‌شود"
                  : "جلسه با کدام داور برگزار شود؟"
              }
              description={
                singleArbitrator
                  ? "رسیدگی به پرونده‌های مؤسسه بر عهده داور زیر است. برای ادامه، مرحله بعد را انتخاب کنید."
                  : "گزینه‌ای را انتخاب کنید که حوزه فعالیت آن به موضوع شما نزدیک‌تر است."
              }
              error={errors.arbitratorId}
            >
              {bookableArbitrators.length === 0 ? (
                <EmptyState
                  className="border border-line"
                  icon="users"
                  title="در حال حاضر امکان رزرو آنلاین وجود ندارد"
                  description="لطفاً از طریق فرم تماس یا تماس تلفنی اقدام کنید."
                  action={{ label: "تماس با ما", href: ROUTES.contact }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {bookableArbitrators.map((arbitrator) => (
                    <label
                      key={arbitrator.id}
                      className={cn(
                        "group flex cursor-pointer items-center gap-4 rounded-sm border bg-white p-4 transition-all duration-250",
                        data.arbitratorId === arbitrator.id
                          ? "border-navy-900 shadow-[0_0_0_1px_var(--color-navy-900)]"
                          : "border-line-2 hover:border-navy-400",
                      )}
                    >
                      <input
                        type="radio"
                        name="arbitrator-ui"
                        className="sr-only"
                        checked={data.arbitratorId === arbitrator.id}
                        onChange={() => selectArbitrator(arbitrator.id)}
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-[1.1rem] shrink-0 items-center justify-center rounded-full border transition-colors",
                          data.arbitratorId === arbitrator.id
                            ? "border-[5px] border-navy-900"
                            : "border-line-2 group-hover:border-navy-500",
                        )}
                      />
                      <ArbitratorRow
                        arbitrator={arbitrator}
                        selected={data.arbitratorId === arbitrator.id}
                      />
                    </label>
                  ))}
                </div>
              )}
            </StepPanel>
          )}

          {/* ---- step 3: date ------------------------------------------ */}
          {step === 2 && (
            <StepPanel
              title="تاریخ جلسه را انتخاب کنید"
              description={workingWeekLabel}
              error={errors.date}
            >
              <div className="max-w-md">
                <JalaliCalendar
                  value={data.date}
                  minIso={minIso}
                  maxIso={maxIso}
                  isDisabled={isDayClosed}
                  onChange={selectDate}
                />
              </div>

              {data.date && (
                <p className="mt-4 flex items-center gap-2 text-[0.875rem] text-navy-800">
                  <Icon name="calendar" size={16} className="text-gold-600" />
                  {formatJalaliLong(data.date)}
                </p>
              )}
            </StepPanel>
          )}

          {/* ---- step 4: time ------------------------------------------ */}
          {step === 3 && (
            <StepPanel
              title="ساعت جلسه را انتخاب کنید"
              description={
                data.date
                  ? `ساعت‌های خالی ${selectedArbitrator?.fullName ?? ""} در ${formatJalaliLong(data.date)}`
                  : undefined
              }
              error={errors.time}
            >
              {loadingSlots || slots === null ? (
                <LoadingState label="در حال دریافت ساعت‌های خالی…" className="py-12" />
              ) : slotError ? (
                <Alert tone="danger" title="خطا در دریافت اطلاعات">
                  <div className="flex flex-col items-start gap-3">
                    <span>{slotError}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="refresh"
                      onClick={() => loadSlots(data.arbitratorId, data.date)}
                    >
                      تلاش مجدد
                    </Button>
                  </div>
                </Alert>
              ) : slots.length === 0 ? (
                <EmptyState
                  className="border border-line"
                  icon="calendar"
                  title="این روز ساعت خالی ندارد"
                  description="لطفاً به مرحله قبل بازگردید و تاریخ دیگری انتخاب کنید."
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => set("time", slot.time)}
                        aria-pressed={data.time === slot.time}
                        className={cn(
                          "flex h-12 items-center justify-center rounded-sm border text-[0.9375rem] font-medium tabular-nums transition-all duration-200",
                          data.time === slot.time
                            ? "border-navy-900 bg-navy-900 text-white"
                            : slot.available
                              ? "border-line-2 text-navy-900 hover:border-navy-500 hover:bg-paper-2"
                              : "cursor-not-allowed border-line bg-paper-2/60 text-muted-2/60 line-through",
                        )}
                      >
                        {fa(slot.time)}
                      </button>
                    ))}
                  </div>

                  <p className="mt-5 flex items-center gap-2 text-[0.8125rem] text-muted">
                    <Icon name="info" size={15} className="text-gold-600" />
                    ساعت‌های خط‌خورده رزرو شده یا خارج از مهلت رزرو هستند.
                  </p>
                </>
              )}
            </StepPanel>
          )}

          {/* ---- step 5: personal details ------------------------------ */}
          {step === 4 && (
            <StepPanel
              title="اطلاعات تماس شما"
              description="این اطلاعات فقط برای هماهنگی جلسه استفاده می‌شود."
            >
              <div className="flex flex-col gap-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field
                    htmlFor="apt-fullName"
                    label="نام و نام خانوادگی"
                    required
                    error={errors.fullName}
                  >
                    <Input
                      id="apt-fullName"
                      autoComplete="name"
                      value={data.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                      placeholder="مثال: رضا کاویانی"
                      invalid={Boolean(errors.fullName)}
                    />
                  </Field>

                  <Field
                    htmlFor="apt-phone"
                    label="شماره موبایل"
                    required
                    hint="کد رزرو با همین شماره قابل استعلام است."
                    error={errors.phone}
                  >
                    <Input
                      id="apt-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      ltr
                      value={data.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="09123456789"
                      invalid={Boolean(errors.phone)}
                    />
                    {requirePhoneVerification && (
                      <div className="mt-3">
                        <PhoneChallenge
                          csrfToken={csrfToken}
                          purpose="appointment"
                          phone={data.phone}
                          onProof={handleProof}
                        />
                      </div>
                    )}
                  </Field>
                </div>

                <Field
                  htmlFor="apt-email"
                  label="ایمیل"
                  optionalLabel
                  hint="برای جلسات آنلاین، لینک جلسه به این نشانی ارسال می‌شود."
                  error={errors.email}
                >
                  <Input
                    id="apt-email"
                    type="email"
                    autoComplete="email"
                    ltr
                    value={data.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="name@example.com"
                    invalid={Boolean(errors.email)}
                  />
                </Field>

                <Field
                  htmlFor="apt-subject"
                  label="موضوع جلسه"
                  required
                  hint="در چند جمله بنویسید درباره چه موضوعی می‌خواهید مشورت کنید."
                  error={errors.subject}
                >
                  <Textarea
                    id="apt-subject"
                    rows={4}
                    value={data.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    placeholder="مثال: بررسی شرط داوری در قرارداد نمایندگی و امکان طرح دعوا"
                    invalid={Boolean(errors.subject)}
                  />
                </Field>
              </div>
            </StepPanel>
          )}

          {/* ---- step 6: meeting mode ---------------------------------- */}
          {step === 5 && (
            <StepPanel
              title="جلسه چگونه برگزار شود؟"
              description="گزینه‌های در دسترس بر اساس نوع مشاوره انتخابی شما نمایش داده می‌شود."
              error={errors.meetingMode}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {(["in-person", "online", "phone"] as MeetingMode[]).map((mode) => {
                  const allowed = selectedType?.modes.includes(mode) ?? true;
                  return (
                    <RadioCard
                      key={mode}
                      name="meetingMode-ui"
                      checked={data.meetingMode === mode}
                      onChange={() => set("meetingMode", mode)}
                      option={{
                        value: mode,
                        title: MEETING_MODE[mode].label,
                        description: allowed
                          ? MEETING_MODE[mode].description
                          : "برای این نوع مشاوره در دسترس نیست.",
                        disabled: !allowed,
                      }}
                    />
                  );
                })}
              </div>
            </StepPanel>
          )}

          {/* ---- step 7: confirm --------------------------------------- */}
          {step === 6 && (
            <StepPanel
              title="بازبینی و تأیید نهایی"
              description="اطلاعات زیر را بررسی کنید. در صورت نیاز به اصلاح، روی هر مرحله در نوار بالا کلیک کنید."
            >
              <dl className="divide-y divide-line border-y border-line">
                {[
                  { label: "نوع مشاوره", value: selectedType?.title, step: 0 },
                  {
                    label: "داور",
                    value: selectedArbitrator?.fullName,
                    step: 1,
                  },
                  {
                    label: "تاریخ",
                    value: data.date ? formatJalaliLong(data.date) : undefined,
                    step: 2,
                  },
                  { label: "ساعت", value: data.time ? fa(data.time) : undefined, step: 3 },
                  {
                    label: "مدت جلسه",
                    value: selectedType
                      ? `${fa(selectedType.durationMinutes)} دقیقه`
                      : undefined,
                    step: 0,
                  },
                  { label: "نام و نام خانوادگی", value: data.fullName, step: 4 },
                  { label: "شماره موبایل", value: fa(data.phone), step: 4 },
                  { label: "ایمیل", value: data.email || "—", step: 4 },
                  {
                    label: "نحوه برگزاری",
                    value: data.meetingMode
                      ? MEETING_MODE[data.meetingMode].label
                      : undefined,
                    step: 5,
                  },
                  { label: "موضوع جلسه", value: data.subject, step: 4 },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 text-[0.875rem]"
                  >
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="flex items-center gap-3 text-start font-medium text-navy-900">
                      {row.value || "—"}
                      <button
                        type="button"
                        onClick={() => jumpTo(row.step)}
                        className="text-[0.75rem] font-normal text-muted underline underline-offset-4 transition-colors hover:text-navy-800"
                      >
                        ویرایش
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-7">
                <Checkbox
                  id="apt-consent"
                  checked={data.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  error={errors.consent}
                  label={
                    <>
                      صحت اطلاعات واردشده را تأیید می‌کنم و{" "}
                      <Link
                        href={ROUTES.privacy}
                        target="_blank"
                        className="font-medium text-navy-800 underline underline-offset-4 decoration-gold-300 hover:decoration-gold-500"
                      >
                        سیاست حفظ حریم خصوصی
                      </Link>{" "}
                      و{" "}
                      <Link
                        href={ROUTES.terms}
                        target="_blank"
                        className="font-medium text-navy-800 underline underline-offset-4 decoration-gold-300 hover:decoration-gold-500"
                      >
                        شرایط و قوانین
                      </Link>{" "}
                      مؤسسه را می‌پذیرم.
                    </>
                  }
                />
              </div>

              <Alert tone="info" className="mt-6">
                رزرو شما پس از ثبت، در وضعیت «در انتظار تأیید» قرار می‌گیرد و پس از
                بررسی توسط دبیرخانه، تأیید نهایی به شما اعلام می‌شود.
              </Alert>
            </StepPanel>
          )}

          {/* ---- navigation -------------------------------------------- */}
          <div className="mt-9 flex flex-col-reverse gap-3 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              icon="arrow-back"
              onClick={goBack}
              disabled={step === 0 || pending}
              className={step === 0 ? "invisible" : undefined}
            >
              مرحله قبل
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                iconEnd="arrow-forward"
                onClick={goNext}
                className="sm:min-w-[12rem]"
              >
                مرحله بعد
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={pending}
                loadingText="در حال ثبت رزرو…"
                onClick={(event) => {
                  if (!validateStep(6)) event.preventDefault();
                }}
                className="sm:min-w-[12rem]"
              >
                ثبت نهایی رزرو
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function StepPanel({
  title,
  description,
  error,
  children,
}: {
  title: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up">
      <h2 className="text-[1.1875rem] font-bold text-navy-900 sm:text-[1.375rem]">
        {title}
      </h2>
      {description && (
        <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-[2] text-muted">
          {description}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-1.5 text-[0.875rem] text-danger"
        >
          <Icon name="alert" size={16} className="mt-0.5" />
          {error}
        </p>
      )}

      <div className="mt-7">{children}</div>
    </section>
  );
}
