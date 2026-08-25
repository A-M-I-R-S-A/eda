import type { AppointmentSettings, TimeSlot, WorkingDayConfig } from "@/types";
import { fa } from "@/lib/utils/persian";

/**
 * Appointment scheduling rules.
 *
 * Every rule that used to be a constant here — opening hours, which days are
 * closed, how far ahead bookings open, how much notice is required — is now an
 * `AppointmentSettings` record edited at `/admin/appointments/settings`. The
 * functions stay free of I/O so the same code is authoritative on the server
 * and can drive instant feedback on the client; settings and booked times are
 * passed in.
 */

/** Minimum notice before a slot can be booked, in hours. */
export const MIN_NOTICE_HOURS = 3;

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Converts a date to the Iranian weekday index used by the settings record.
 *
 * JavaScript counts from Sunday; the Persian week starts on Saturday, which
 * `getDay()` reports as 6. Getting this wrong silently shifts the entire
 * working week by one day, so it lives in exactly one place.
 */
export function iranWeekday(iso: string): number {
  return (parseIsoDate(iso).getDay() + 1) % 7;
}

function dayConfig(
  iso: string,
  settings: AppointmentSettings,
): WorkingDayConfig | undefined {
  return settings.days.find((day) => day.day === iranWeekday(iso));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotDateTime(iso: string, time: string): Date {
  const date = parseIsoDate(iso);
  const [h, m] = time.split(":").map(Number);
  date.setHours(h, m, 0, 0);
  return date;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function shiftedIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*  Day availability                                                          */
/* -------------------------------------------------------------------------- */

/** A day is closed when its weekday is off or it is explicitly blocked. */
export function isClosedDay(iso: string, settings: AppointmentSettings): boolean {
  if (settings.blockedDates.includes(iso)) return true;
  const day = dayConfig(iso, settings);
  return !day || !day.enabled;
}

/** Earliest date the calendar accepts, as `YYYY-MM-DD`. */
export function bookingStartIso(settings: AppointmentSettings): string {
  return settings.leadTimeDays > 0 ? shiftedIso(settings.leadTimeDays) : todayIso();
}

/** Latest date the calendar accepts, as `YYYY-MM-DD`. */
export function bookingHorizonIso(settings: AppointmentSettings): string {
  return shiftedIso(settings.horizonDays);
}

/**
 * The slot grid for a day.
 *
 * Slots are generated from that weekday's opening hours, stepping by the
 * configured slot length plus its buffer — a 60-minute meeting with a
 * 15-minute buffer produces starts every 75 minutes, which is what an
 * administrator setting a buffer actually means.
 */
export function slotsForDate(
  iso: string,
  settings: AppointmentSettings,
): string[] {
  const day = dayConfig(iso, settings);
  if (!day || !day.enabled || settings.blockedDates.includes(iso)) return [];

  const step = Math.max(5, settings.slotMinutes + settings.bufferMinutes);
  const start = toMinutes(day.start);
  const end = toMinutes(day.end);

  const slots: string[] = [];
  for (
    let minute = start;
    minute + settings.slotMinutes <= end;
    minute += step
  ) {
    slots.push(toTime(minute));
    // A misconfigured day (start after end, zero step) must not spin forever.
    if (slots.length > 48) break;
  }

  return slots;
}

/**
 * Every slot for a day, marked available or taken.
 *
 * A day already at its booking cap reports every remaining slot as
 * unavailable, so the daily maximum is visible in the calendar rather than
 * only discovered at submission.
 */
export function buildDaySlots(
  iso: string,
  bookedTimes: string[],
  settings: AppointmentSettings,
): TimeSlot[] {
  const cutoff = Date.now() + MIN_NOTICE_HOURS * 60 * 60 * 1000;
  const taken = new Set(bookedTimes);
  const atCapacity = bookedTimes.length >= settings.maxPerDay;

  return slotsForDate(iso, settings).map((time) => ({
    time,
    available:
      !atCapacity &&
      !taken.has(time) &&
      slotDateTime(iso, time).getTime() > cutoff,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Authoritative check                                                       */
/* -------------------------------------------------------------------------- */

export type SlotCheck = { ok: true } | { ok: false; message: string };

/**
 * Server-side validation for a submitted slot.
 *
 * The client's slot list can be stale and two visitors can reach the same slot
 * at the same moment, so every rule is re-applied here regardless of what the
 * form believed was available.
 */
export function isSlotSelectable(
  iso: string,
  time: string,
  bookedTimes: string[],
  settings: AppointmentSettings,
): SlotCheck {
  if (!settings.enabled) {
    return { ok: false, message: "رزرو آنلاین وقت در حال حاضر غیرفعال است." };
  }

  if (settings.blockedDates.includes(iso)) {
    return { ok: false, message: "این تاریخ در تقویم مؤسسه تعطیل اعلام شده است." };
  }

  if (isClosedDay(iso, settings)) {
    return { ok: false, message: "روز انتخاب‌شده تعطیل است." };
  }

  if (iso < bookingStartIso(settings)) {
    return {
      ok: false,
      message: `رزرو باید حداقل ${fa(settings.leadTimeDays)} روز پیش از جلسه انجام شود.`,
    };
  }

  if (iso > bookingHorizonIso(settings)) {
    return {
      ok: false,
      message:
        "امکان رزرو برای این تاریخ هنوز فراهم نیست. لطفاً تاریخ نزدیک‌تری انتخاب کنید.",
    };
  }

  if (!slotsForDate(iso, settings).includes(time)) {
    return { ok: false, message: "ساعت انتخاب‌شده در برنامه کاری قرار ندارد." };
  }

  if (bookedTimes.includes(time)) {
    return {
      ok: false,
      message: "این ساعت هم‌اکنون رزرو شده است. لطفاً زمان دیگری انتخاب کنید.",
    };
  }

  if (bookedTimes.length >= settings.maxPerDay) {
    return {
      ok: false,
      message: "ظرفیت رزرو این روز تکمیل شده است. لطفاً روز دیگری انتخاب کنید.",
    };
  }

  if (
    slotDateTime(iso, time).getTime() <=
    Date.now() + MIN_NOTICE_HOURS * 60 * 60 * 1000
  ) {
    return {
      ok: false,
      message: `رزرو باید حداقل ${fa(MIN_NOTICE_HOURS)} ساعت پیش از زمان جلسه انجام شود.`,
    };
  }

  return { ok: true };
}
