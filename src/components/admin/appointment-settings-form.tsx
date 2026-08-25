"use client";

import { useActionState, useState } from "react";
import type { AppointmentSettings, AppointmentTypeConfig } from "@/types";
import { cn } from "@/lib/utils/cn";
import { newId } from "@/lib/utils/id";
import { fa } from "@/lib/utils/persian";
import { formatJalali } from "@/lib/utils/jalali";
import { MEETING_MODE, WEEKDAYS } from "@/lib/config/labels";
import { CSRF_FIELD } from "@/lib/security/csrf-field";
import { idleState, type FormState } from "@/lib/actions/types";
import { saveAppointmentSettingsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { FormSection, ToggleField } from "./form-shell";
import { DragHandle, SortableList } from "./sortable";
import { DirtyBadge, useUnsavedChanges } from "./dialog";

/**
 * Booking rules.
 *
 * The public calendar is generated entirely from this record — which weekdays
 * are open, their hours, slot length, buffer, daily cap, how far ahead
 * bookings open and which dates are closed. Nothing about the schedule is
 * hard-coded in the booking wizard any more.
 */

type ModeKey = "in-person" | "online" | "phone";
const MODES: ModeKey[] = ["in-person", "online", "phone"];

interface TypeRow extends AppointmentTypeConfig {
  __key: string;
}

const inputClass =
  "h-10 w-full rounded-sm border border-line-2 bg-white px-3 text-[0.875rem] focus:border-navy-600 focus:outline-none focus:ring-[3px] focus:ring-navy-900/[0.07]";

function TypeEditor({ types: initial }: { types: AppointmentTypeConfig[] }) {
  const [types, setTypes] = useState<TypeRow[]>(() =>
    [...initial]
      .sort((a, b) => a.order - b.order)
      .map((type) => ({ ...type, __key: type.id || newId() })),
  );
  const [open, setOpen] = useState<string | null>(null);

  const update = (key: string, patch: Partial<TypeRow>) =>
    setTypes((prev) =>
      prev.map((type) => (type.__key === key ? { ...type, ...patch } : type)),
    );

  const toggleMode = (key: string, mode: ModeKey) =>
    setTypes((prev) =>
      prev.map((type) => {
        if (type.__key !== key) return type;
        const modes = type.modes.includes(mode)
          ? type.modes.filter((m) => m !== mode)
          : [...type.modes, mode];
        return { ...type, modes };
      }),
    );

  return (
    <div className="flex flex-col gap-3">
      {types.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-2 px-4 py-6 text-center text-[0.8125rem] text-muted">
          هیچ نوع جلسه‌ای تعریف نشده است. بدون آن، فرم رزرو قابل استفاده نیست.
        </p>
      ) : (
        <SortableList items={types} getKey={(type) => type.__key} onReorder={setTypes}>
          {(type, props) => {
            const isOpen = open === type.__key;

            return (
              <div
                className={cn(
                  "rounded-sm border bg-white",
                  isOpen ? "border-navy-400" : "border-line-2",
                  !type.enabled && "opacity-60",
                )}
              >
                <input type="hidden" name="typeId" value={type.id} />
                <input type="hidden" name="typeValue" value={type.value} />
                <input
                  type="hidden"
                  name="typeEnabled"
                  value={type.enabled ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name="typeModes"
                  value={type.modes.join(",")}
                />
                {!isOpen && (
                  <>
                    <input
                      type="hidden"
                      name="typeDescription"
                      value={type.description}
                    />
                    <input type="hidden" name="typeFee" value={type.feeLabel} />
                  </>
                )}

                <div className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center">
                  <DragHandle {...props} label={type.title || "نوع جلسه"} />

                  <label className="sr-only" htmlFor={`type-title-${type.__key}`}>
                    عنوان نوع جلسه
                  </label>
                  <input
                    id={`type-title-${type.__key}`}
                    name="typeTitle"
                    value={type.title}
                    onChange={(event) =>
                      update(type.__key, { title: event.target.value })
                    }
                    placeholder="عنوان نوع جلسه"
                    className={cn(inputClass, "flex-1")}
                  />

                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`type-dur-${type.__key}`}>
                      مدت جلسه به دقیقه
                    </label>
                    <input
                      id={`type-dur-${type.__key}`}
                      name="typeDuration"
                      type="number"
                      min={10}
                      max={480}
                      step={5}
                      value={type.durationMinutes}
                      onChange={(event) =>
                        update(type.__key, {
                          durationMinutes: Number(event.target.value),
                        })
                      }
                      dir="ltr"
                      className={cn(inputClass, "w-20 text-center")}
                    />
                    <span className="shrink-0 text-[0.75rem] text-muted">دقیقه</span>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : type.__key)}
                      aria-expanded={isOpen}
                      aria-label="جزئیات بیشتر"
                      title="جزئیات بیشتر"
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                    >
                      <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => update(type.__key, { enabled: !type.enabled })}
                      aria-label={type.enabled ? "غیرفعال کردن" : "فعال کردن"}
                      title={type.enabled ? "غیرفعال کردن" : "فعال کردن"}
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800"
                    >
                      <Icon name={type.enabled ? "eye" : "eye-off"} size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTypes((prev) =>
                          prev.filter((item) => item.__key !== type.__key),
                        )
                      }
                      aria-label="حذف نوع جلسه"
                      title="حذف نوع جلسه"
                      className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="flex flex-col gap-4 border-t border-line p-4">
                    <div>
                      <label
                        className="mb-1.5 block text-[0.75rem] text-muted"
                        htmlFor={`type-desc-${type.__key}`}
                      >
                        توضیح (در فرم رزرو نمایش داده می‌شود)
                      </label>
                      <textarea
                        id={`type-desc-${type.__key}`}
                        name="typeDescription"
                        rows={2}
                        value={type.description}
                        onChange={(event) =>
                          update(type.__key, { description: event.target.value })
                        }
                        className="w-full rounded-sm border border-line-2 bg-white px-3 py-2 text-[0.875rem] leading-[1.9] focus:border-navy-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          className="mb-1.5 block text-[0.75rem] text-muted"
                          htmlFor={`type-fee-${type.__key}`}
                        >
                          توضیح هزینه
                        </label>
                        <input
                          id={`type-fee-${type.__key}`}
                          name="typeFee"
                          value={type.feeLabel}
                          onChange={(event) =>
                            update(type.__key, { feeLabel: event.target.value })
                          }
                          placeholder="بر اساس تعرفه مصوب مؤسسه"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <p className="mb-1.5 text-[0.75rem] text-muted">
                          شیوه‌های برگزاری
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {MODES.map((mode) => {
                            const active = type.modes.includes(mode);
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => toggleMode(type.__key, mode)}
                                aria-pressed={active}
                                className={cn(
                                  "h-9 rounded-sm border px-3 text-[0.8125rem] transition-colors",
                                  active
                                    ? "border-navy-900 bg-navy-900 text-white"
                                    : "border-line-2 text-muted hover:border-navy-500",
                                )}
                              >
                                {MEETING_MODE[mode].label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        </SortableList>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        icon="plus"
        disabled={types.length >= 12}
        onClick={() => {
          const key = newId();
          setTypes((prev) => [
            ...prev,
            {
              id: key,
              __key: key,
              value: "",
              title: "",
              description: "",
              durationMinutes: 30,
              feeLabel: "",
              modes: ["in-person"],
              enabled: true,
              order: prev.length,
            },
          ]);
          setOpen(key);
        }}
        className="self-start"
      >
        افزودن نوع جلسه
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function AppointmentSettingsForm({
  settings,
  csrfToken,
}: {
  settings: AppointmentSettings;
  csrfToken: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveAppointmentSettingsAction,
    idleState as FormState,
  );

  const [days, setDays] = useState(settings.days);
  const [blocked, setBlocked] = useState<string[]>(settings.blockedDates);
  const [newDate, setNewDate] = useState("");
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(
    dirty && state.status !== "success",
    "تغییرات ذخیره‌نشده‌ای در تنظیمات نوبت‌دهی دارید. اگر خارج شوید، این تغییرات از دست می‌رود.",
  );

  const error = (name: string) => state.fieldErrors?.[name];

  const updateDay = (index: number, patch: Partial<(typeof days)[number]>) => {
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
    setDirty(true);
  };

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="flex flex-col gap-6 pb-28"
    >
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      <input type="hidden" name="blockedDates" value={blocked.join(",")} />

      {state.status !== "idle" && (
        <Alert
          tone={state.status === "success" ? "success" : "danger"}
          title={state.status === "success" ? "انجام شد" : "ذخیره‌سازی انجام نشد"}
        >
          {state.message}
        </Alert>
      )}

      <FormSection
        title="وضعیت رزرو آنلاین"
        description="با خاموش کردن این گزینه، فرم رزرو در وب‌سایت غیرفعال می‌شود."
      >
        <ToggleField
          name="enabled"
          label="رزرو آنلاین وقت فعال باشد"
          defaultChecked={settings.enabled}
        />

        <ToggleField
          name="requireApproval"
          label="نیاز به تأیید دستی"
          description="رزروهای جدید در وضعیت «در انتظار تأیید» ثبت می‌شوند تا شما آن‌ها را بررسی کنید."
          defaultChecked={settings.requireApproval}
        />

        <Field
          htmlFor="note"
          label="یادداشت برای مراجعان"
          hint="در فرم رزرو نمایش داده می‌شود. اختیاری."
          error={error("note")}
        >
          <Textarea id="note" name="note" rows={2} defaultValue={settings.note} />
        </Field>
      </FormSection>

      <FormSection
        title="انواع جلسه"
        description="هر نوع جلسه مدت، هزینه و شیوه‌های برگزاری خودش را دارد."
      >
        <TypeEditor types={settings.types} />
      </FormSection>

      <FormSection
        title="روزها و ساعات کاری"
        description="زمان‌های قابل رزرو از روی همین جدول ساخته می‌شوند."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse">
            <caption className="sr-only">ساعات کاری هفته</caption>
            <thead>
              <tr className="border-b border-line text-[0.75rem] text-muted">
                <th scope="col" className="px-2 py-2 text-start">روز</th>
                <th scope="col" className="px-2 py-2 text-start">وضعیت</th>
                <th scope="col" className="px-2 py-2 text-start">شروع</th>
                <th scope="col" className="px-2 py-2 text-start">پایان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {days.map((day, index) => (
                <tr key={day.day}>
                  <input type="hidden" name="dayIndex" value={day.day} />
                  <input
                    type="hidden"
                    name="dayEnabled"
                    value={day.enabled ? "1" : "0"}
                  />

                  <td className="px-2 py-2.5 text-[0.875rem] font-medium text-navy-900">
                    {WEEKDAYS[day.day]}
                  </td>

                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => updateDay(index, { enabled: !day.enabled })}
                      aria-pressed={day.enabled}
                      className={cn(
                        "h-8 rounded-sm border px-3 text-[0.75rem] font-medium transition-colors",
                        day.enabled
                          ? "border-success/30 bg-success-soft text-success"
                          : "border-line-2 text-muted",
                      )}
                    >
                      {day.enabled ? "باز" : "تعطیل"}
                    </button>
                  </td>

                  <td className="px-2 py-2.5">
                    <label className="sr-only" htmlFor={`start-${day.day}`}>
                      ساعت شروع {WEEKDAYS[day.day]}
                    </label>
                    <input
                      id={`start-${day.day}`}
                      name="dayStart"
                      type="time"
                      value={day.start}
                      disabled={!day.enabled}
                      onChange={(event) =>
                        updateDay(index, { start: event.target.value })
                      }
                      dir="ltr"
                      className={cn(inputClass, "w-32 disabled:bg-paper-2")}
                    />
                  </td>

                  <td className="px-2 py-2.5">
                    <label className="sr-only" htmlFor={`end-${day.day}`}>
                      ساعت پایان {WEEKDAYS[day.day]}
                    </label>
                    <input
                      id={`end-${day.day}`}
                      name="dayEnd"
                      type="time"
                      value={day.end}
                      disabled={!day.enabled}
                      onChange={(event) =>
                        updateDay(index, { end: event.target.value })
                      }
                      dir="ltr"
                      className={cn(inputClass, "w-32 disabled:bg-paper-2")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>

      <FormSection
        title="قواعد زمان‌بندی"
        description="این مقادیر تعیین می‌کنند چه ساعت‌هایی در تقویم رزرو نمایش داده شوند."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            htmlFor="slotMinutes"
            label="طول هر بازه (دقیقه)"
            error={error("slotMinutes")}
          >
            <Input
              id="slotMinutes"
              name="slotMinutes"
              type="number"
              min={10}
              max={240}
              step={5}
              defaultValue={settings.slotMinutes}
              ltr
            />
          </Field>

          <Field
            htmlFor="bufferMinutes"
            label="فاصله بین جلسات (دقیقه)"
            hint="زمان استراحت پس از هر جلسه."
            error={error("bufferMinutes")}
          >
            <Input
              id="bufferMinutes"
              name="bufferMinutes"
              type="number"
              min={0}
              max={120}
              step={5}
              defaultValue={settings.bufferMinutes}
              ltr
            />
          </Field>

          <Field
            htmlFor="maxPerDay"
            label="حداکثر رزرو در روز"
            error={error("maxPerDay")}
          >
            <Input
              id="maxPerDay"
              name="maxPerDay"
              type="number"
              min={1}
              max={50}
              defaultValue={settings.maxPerDay}
              ltr
            />
          </Field>

          <Field
            htmlFor="leadTimeDays"
            label="حداقل فاصله تا جلسه (روز)"
            hint="صفر یعنی امکان رزرو برای همین امروز."
            error={error("leadTimeDays")}
          >
            <Input
              id="leadTimeDays"
              name="leadTimeDays"
              type="number"
              min={0}
              max={60}
              defaultValue={settings.leadTimeDays}
              ltr
            />
          </Field>

          <Field
            htmlFor="horizonDays"
            label="بازه باز بودن تقویم (روز)"
            hint="تا چند روز آینده امکان رزرو وجود دارد."
            error={error("horizonDays")}
          >
            <Input
              id="horizonDays"
              name="horizonDays"
              type="number"
              min={1}
              max={365}
              defaultValue={settings.horizonDays}
              ltr
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="روزهای تعطیل"
        description="تاریخ‌هایی که فارغ از برنامه هفتگی، امکان رزرو ندارند."
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label
              htmlFor="blocked-date"
              className="mb-2 block text-[0.875rem] font-semibold text-navy-800"
            >
              افزودن تاریخ تعطیل
            </label>
            <input
              id="blocked-date"
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
              dir="ltr"
              className="min-h-12 w-full rounded-sm border border-line-2 bg-white px-4 py-3 text-[0.9375rem] focus:border-navy-600 focus:outline-none"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            icon="plus"
            disabled={!newDate || blocked.includes(newDate)}
            onClick={() => {
              if (!newDate) return;
              setBlocked((prev) => [...new Set([...prev, newDate])].sort());
              setNewDate("");
              setDirty(true);
            }}
          >
            افزودن
          </Button>
        </div>

        {blocked.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            تاریخ تعطیلی ثبت نشده است.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {blocked.map((date) => (
              <li key={date}>
                <span className="flex items-center gap-2 rounded-sm border border-line-2 bg-white py-1.5 pe-2 ps-3 text-[0.8125rem]">
                  <span className="tabular-nums text-navy-900">
                    {formatJalali(date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBlocked((prev) => prev.filter((item) => item !== date));
                      setDirty(true);
                    }}
                    aria-label={`حذف ${formatJalali(date)}`}
                    className="flex size-6 items-center justify-center rounded-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md lg:start-[16.5rem]">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="hidden items-center gap-3 sm:flex">
            <DirtyBadge dirty={dirty && state.status !== "success"} />
            <p className="text-[0.75rem] text-muted">
              {fa(days.filter((day) => day.enabled).length)} روز کاری در هفته
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={pending}
            loadingText="در حال ذخیره…"
            className="ms-auto min-w-[9rem]"
          >
            ذخیره تغییرات
          </Button>
        </div>
      </div>
    </form>
  );
}
