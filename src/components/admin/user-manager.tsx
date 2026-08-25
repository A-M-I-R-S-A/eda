"use client";

import { useState } from "react";
import type { PublicUser, UserRole } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/jalali";
import { USER_ROLE, USER_ROLE_DESCRIPTION, USER_STATUS } from "@/lib/config/labels";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { deleteUserAction, saveUserAction } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Field, Input, RadioCard, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Alert } from "@/components/ui/states";
import { CollectionManager } from "./collection-manager";

/**
 * Administrator accounts.
 *
 * Roles are described in the picker rather than named alone, because "editor"
 * and "manager" mean nothing until you know what each can reach. The
 * corresponding server-side rule lives in `@/lib/auth/permissions`; this is
 * only its explanation.
 */

function UserFields({
  user,
  currentUserId,
  error,
}: {
  user?: PublicUser;
  currentUserId: string;
  error: (name: string) => string[] | undefined;
}) {
  const [role, setRole] = useState<UserRole>(user?.role ?? "editor");
  const isSelf = user?.id === currentUserId;

  return (
    <>
      {isSelf && (
        <Alert tone="info">
          این حساب کاربری خود شماست. برای جلوگیری از قفل شدن دسترسی، نقش و
          وضعیت آن از همین‌جا قابل تغییر نیست.
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="u-name"
          label="نام و نام خانوادگی"
          required
          error={error("fullName")}
        >
          <Input
            id="u-name"
            name="fullName"
            defaultValue={user?.fullName}
            required
            invalid={Boolean(error("fullName"))}
          />
        </Field>

        <Field htmlFor="u-email" label="ایمیل" required error={error("email")}>
          <Input
            id="u-email"
            name="email"
            type="email"
            ltr
            defaultValue={user?.email}
            required
            invalid={Boolean(error("email"))}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="u-phone" label="شماره تماس" error={error("phone")}>
          <Input
            id="u-phone"
            name="phone"
            ltr
            inputMode="numeric"
            defaultValue={user?.phone ?? ""}
            invalid={Boolean(error("phone"))}
          />
        </Field>

        <Field htmlFor="u-status" label="وضعیت حساب">
          <Select
            id="u-status"
            name="status"
            defaultValue={user?.status ?? "active"}
            disabled={isSelf}
            options={[
              { value: "active", label: "فعال" },
              { value: "pending", label: "در انتظار تأیید" },
              { value: "suspended", label: "مسدود" },
            ]}
          />
        </Field>
      </div>

      <Field
        htmlFor="u-password"
        label={user ? "رمز عبور جدید" : "رمز عبور"}
        required={!user}
        hint={
          user
            ? "برای حفظ رمز فعلی، این فیلد را خالی بگذارید."
            : "حداقل ۱۰ نویسه. ترکیبی از حروف، عدد و نماد انتخاب کنید."
        }
        error={error("password")}
      >
        <Input
          id="u-password"
          name="password"
          type="password"
          ltr
          autoComplete="new-password"
          minLength={user ? undefined : 10}
          required={!user}
          invalid={Boolean(error("password"))}
        />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[0.875rem] font-semibold text-navy-800">
          نقش کاربر
          <span className="text-gold-600" aria-hidden="true">
            {" "}
            *
          </span>
        </legend>

        <div className="flex flex-col gap-2.5">
          {ASSIGNABLE_ROLES.map((value) => (
            <RadioCard
              key={value}
              name="role"
              compact
              checked={role === value}
              onChange={() => !isSelf && setRole(value)}
              option={{
                value,
                title: USER_ROLE[value],
                description: USER_ROLE_DESCRIPTION[value],
                disabled: isSelf,
              }}
            />
          ))}
        </div>
        {/* The radio group is disabled for your own account, and a disabled
            input posts nothing — so the current role is carried explicitly. */}
        {isSelf && <input type="hidden" name="role" value={role} />}
      </fieldset>
    </>
  );
}

export function UserManager({
  users,
  currentUserId,
  csrfToken,
}: {
  users: PublicUser[];
  currentUserId: string;
  csrfToken: string;
}) {
  return (
    <CollectionManager
      items={users}
      csrfToken={csrfToken}
      saveAction={saveUserAction}
      deleteAction={deleteUserAction}
      getId={(user) => user.id}
      getLabel={(user) => user.fullName}
      emptyIcon="users"
      labels={{
        addButton: "کاربر جدید",
        createTitle: "افزودن کاربر",
        editTitle: "ویرایش کاربر",
        deleteTitle: "حذف کاربر",
        deleteMessage: (label) => (
          <>
            حساب کاربری «<span className="font-semibold">{label}</span>» حذف
            می‌شود و دسترسی آن به پنل مدیریت بلافاصله قطع می‌گردد.
            <br />
            <br />
            اگر فقط می‌خواهید موقتاً دسترسی را ببندید، به‌جای حذف وضعیت حساب را
            روی «مسدود» بگذارید.
          </>
        ),
        emptyTitle: "کاربری یافت نشد",
        emptyDescription: "با افزودن کاربر جدید، دسترسی به پنل مدیریت بدهید.",
      }}
      renderForm={(user, helpers) => (
        <UserFields
          user={user}
          currentUserId={currentUserId}
          error={helpers.error}
        />
      )}
      renderRow={(user) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold",
              user.role === "admin"
                ? "bg-navy-900 text-gold-200"
                : "bg-paper-2 text-navy-800",
            )}
          >
            {user.fullName.trim().slice(0, 1)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[0.9375rem] font-semibold text-navy-900">
                {user.fullName}
              </span>
              {user.id === currentUserId && (
                <span className="shrink-0 rounded-xs bg-gold-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-gold-700">
                  شما
                </span>
              )}
            </span>
            <span
              dir="ltr"
              className="mt-0.5 block truncate text-start text-[0.75rem] text-muted"
            >
              {user.email}
            </span>
          </span>

          <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
            <Badge tone={USER_STATUS[user.status].tone} dot size="sm">
              {USER_STATUS[user.status].label}
            </Badge>
            <span className="flex items-center gap-1 text-[0.6875rem] text-muted-2">
              <Icon name="shield" size={12} />
              {USER_ROLE[user.role]}
            </span>
          </span>

          <span className="hidden shrink-0 text-[0.6875rem] text-muted-2 lg:block">
            {user.lastLoginAt
              ? `آخرین ورود ${formatRelative(user.lastLoginAt)}`
              : "بدون ورود"}
          </span>
        </div>
      )}
    />
  );
}
