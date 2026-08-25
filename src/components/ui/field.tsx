import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";

/**
 * Form primitives.
 *
 * Every control is at least 48px tall (44px on compact admin tables) so the
 * mobile experience is genuinely touch-friendly rather than a shrunken desktop
 * form. Errors are wired with `aria-describedby` + `aria-invalid`.
 */

/* -------------------------------------------------------------------------- */
/*  Field wrapper                                                             */
/* -------------------------------------------------------------------------- */

export interface FieldProps {
  /** Must match the control's `id`. */
  htmlFor?: string;
  label: string;
  hint?: ReactNode;
  error?: string | string[];
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: ReactNode;
}

export function firstError(error?: string | string[]): string | undefined {
  if (!error) return undefined;
  return Array.isArray(error) ? error[0] : error;
}

export function Field({
  htmlFor,
  label,
  hint,
  error,
  required,
  optionalLabel,
  className,
  children,
}: FieldProps) {
  const message = firstError(error);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1.5 text-[0.875rem] font-semibold text-navy-800"
      >
        <span>{label}</span>
        {required && (
          <span className="text-gold-600" aria-hidden="true">
            *
          </span>
        )}
        {optionalLabel && !required && (
          <span className="text-[0.75rem] font-normal text-muted-2">(اختیاری)</span>
        )}
      </label>

      {children}

      {hint && !message && (
        <p
          id={htmlFor ? `${htmlFor}-hint` : undefined}
          className="text-[0.8125rem] leading-relaxed text-muted"
        >
          {hint}
        </p>
      )}

      {message && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="flex items-start gap-1.5 text-[0.8125rem] leading-relaxed text-danger"
        >
          <Icon name="alert" size={15} className="mt-0.5" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared control styling                                                    */
/* -------------------------------------------------------------------------- */

const controlBase = [
  "w-full rounded-sm border bg-white text-[0.9375rem] text-ink",
  "transition-[border-color,box-shadow,background-color] duration-200",
  "placeholder:text-muted-2/80",
  "focus:outline-none focus:border-navy-600 focus:ring-[3px] focus:ring-navy-900/[0.07]",
  "disabled:bg-paper-2 disabled:text-muted disabled:cursor-not-allowed",
].join(" ");

const controlTone = (invalid?: boolean) =>
  invalid
    ? "border-danger/60 focus:border-danger focus:ring-danger/10"
    : "border-line-2";

export const CONTROL_HEIGHT = "min-h-12 px-4 py-3";

/* -------------------------------------------------------------------------- */
/*  Input                                                                     */
/* -------------------------------------------------------------------------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Forces LTR presentation for phone numbers, emails and codes. */
  ltr?: boolean;
  /** React 19 passes `ref` as an ordinary prop — no `forwardRef` needed. */
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className, invalid, ltr, ...props }: InputProps) {
  return (
    <input
      dir={ltr ? "ltr" : undefined}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlTone(invalid),
        CONTROL_HEIGHT,
        ltr && "text-start font-medium tracking-normal",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Textarea                                                                  */
/* -------------------------------------------------------------------------- */

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, rows = 6, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlTone(invalid),
        "px-4 py-3.5 leading-[2] resize-y",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Select                                                                    */
/* -------------------------------------------------------------------------- */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  className,
  invalid,
  options,
  placeholder,
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          controlTone(invalid),
          CONTROL_HEIGHT,
          "appearance-none ps-4 pe-11 cursor-pointer",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={18}
        className="pointer-events-none absolute inset-y-0 start-4 my-auto text-muted"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Checkbox                                                                  */
/* -------------------------------------------------------------------------- */

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  error?: string | string[];
}

export function Checkbox({ label, error, className, id, ...props }: CheckboxProps) {
  const message = firstError(error);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className="group flex cursor-pointer items-start gap-3 text-[0.875rem] leading-[1.9] text-ink-2"
      >
        <span className="relative mt-[0.3rem] flex size-[1.15rem] shrink-0 items-center justify-center">
          <input
            id={id}
            type="checkbox"
            aria-invalid={message ? true : undefined}
            className={cn(
              "peer size-[1.15rem] cursor-pointer appearance-none rounded-xs border bg-white",
              "transition-colors duration-200",
              "checked:border-navy-900 checked:bg-navy-900",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
              message ? "border-danger/60" : "border-line-2 group-hover:border-navy-500",
            )}
            {...props}
          />
          <Icon
            name="check"
            size={13}
            weight={2.5}
            className="pointer-events-none absolute text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
          />
        </span>
        <span>{label}</span>
      </label>

      {message && (
        <p role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-danger">
          <Icon name="alert" size={15} className="mt-0.5" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Radio cards                                                               */
/* -------------------------------------------------------------------------- */

export interface RadioCardOption {
  value: string;
  title: string;
  description?: string;
  meta?: string;
  disabled?: boolean;
}

export function RadioCard({
  name,
  option,
  defaultChecked,
  checked,
  onChange,
  compact = false,
}: {
  name: string;
  option: RadioCardOption;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-sm border bg-white",
        "transition-[border-color,box-shadow,background-color] duration-250",
        compact ? "p-3.5" : "p-4 sm:p-5",
        "border-line-2 hover:border-navy-400",
        "has-[:checked]:border-navy-900 has-[:checked]:bg-navy-900/[0.025] has-[:checked]:shadow-[0_0_0_1px_var(--color-navy-900)]",
        option.disabled && "cursor-not-allowed opacity-50 hover:border-line-2",
      )}
    >
      <input
        type="radio"
        name={name}
        value={option.value}
        defaultChecked={defaultChecked}
        checked={checked}
        disabled={option.disabled}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="peer sr-only"
      />

      <span
        aria-hidden="true"
        className={cn(
          "mt-1 flex size-[1.1rem] shrink-0 items-center justify-center rounded-full border",
          "border-line-2 transition-colors duration-200 group-hover:border-navy-500",
          "peer-checked:border-navy-900 peer-checked:border-[5px]",
        )}
      />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-[0.9375rem] font-semibold text-navy-900">
            {option.title}
          </span>
          {option.meta && (
            <span className="text-[0.75rem] font-medium text-gold-600">
              {option.meta}
            </span>
          )}
        </span>
        {option.description && (
          <span className="mt-1 block text-[0.8125rem] leading-[1.85] text-muted">
            {option.description}
          </span>
        )}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Fieldset                                                                  */
/* -------------------------------------------------------------------------- */

export function Fieldset({
  legend,
  hint,
  error,
  children,
  className,
}: {
  legend: string;
  hint?: string;
  error?: string | string[];
  children: ReactNode;
  className?: string;
}) {
  const message = firstError(error);

  return (
    <fieldset className={cn("flex flex-col gap-3", className)}>
      <legend className="mb-1 text-[0.875rem] font-semibold text-navy-800">
        {legend}
      </legend>
      {hint && <p className="-mt-1 text-[0.8125rem] text-muted">{hint}</p>}
      {children}
      {message && (
        <p role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-danger">
          <Icon name="alert" size={15} className="mt-0.5" />
          <span>{message}</span>
        </p>
      )}
    </fieldset>
  );
}
