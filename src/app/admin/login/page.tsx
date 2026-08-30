import type { Metadata } from "next";
import Link from "next/link";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { Monogram } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "ورود به پنل مدیریت",
  robots: { index: false, follow: false, nocache: true },
};

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const [{ next }, csrfToken] = await Promise.all([searchParams, getCsrfToken()]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* -- brand panel ---------------------------------------------------- */}
      <div className="on-navy relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="grid-lines pointer-events-none absolute inset-0 opacity-70"
        />

        <Link href={ROUTES.home} className="relative flex items-center gap-3">
          <Monogram size={38} tone="light" />
          <span aria-hidden="true" className="h-8 w-px bg-white/15" />
          <span className="flex flex-col">
            <span className="text-[1.0625rem] font-bold text-white">
              مؤسسه داوری دادآور
            </span>
            <span className="text-[0.6875rem] text-white/50">پنل مدیریت</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="eyebrow eyebrow-on-dark">دسترسی محدود</p>
          <h2 className="mt-5 text-[1.75rem] font-bold leading-[1.55] text-white">
            اطلاعات پرونده‌ها محرمانه است
          </h2>
          <p className="mt-5 text-[0.9375rem] leading-[2.1] text-white/55">
            این بخش تنها برای کاربران مجاز مؤسسه در دسترس است. تمام ورودها ثبت
            می‌شود و دسترسی به اطلاعات بر پایه نقش کاربری محدود شده است.
          </p>

          <ul className="mt-8 flex flex-col gap-3">
            {[
              "نشست‌های امن با انقضای خودکار",
              "محدودسازی تلاش‌های ناموفق ورود",
              "کنترل دسترسی بر اساس نقش",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-[0.875rem] text-white/60"
              >
                <Icon name="check" size={15} weight={2} className="text-gold-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[0.75rem] text-white/35">
          © مؤسسه داوری عدالت گستر جهان داور — تمامی حقوق محفوظ است.
        </p>
      </div>

      {/* -- form ----------------------------------------------------------- */}
      <div className="flex items-center justify-center bg-paper px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            href={ROUTES.home}
            className="mb-10 inline-flex items-center gap-3 lg:hidden"
          >
            <Monogram size={34} />
            <span className="text-[1rem] font-bold text-navy-900">
              مؤسسه داوری عدالت گستر
            </span>
          </Link>

          <div className="surface p-7 sm:p-9">
            <h1 className="text-[1.375rem] font-bold text-navy-950">
              ورود به پنل مدیریت
            </h1>
            <p className="mt-2.5 text-[0.9375rem] leading-[2] text-muted">
              برای ادامه، اطلاعات حساب کاربری خود را وارد کنید.
            </p>

            <hr className="hairline my-7" />

            <LoginForm csrfToken={csrfToken} next={next} />
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 text-[0.8125rem]">
            <Link
              href={ROUTES.home}
              className="flex items-center gap-1.5 text-muted transition-colors hover:text-navy-800"
            >
              <Icon name="arrow-forward" size={14} />
              بازگشت به وب‌سایت
            </Link>

            <Link
              href={ROUTES.contact}
              className="text-muted transition-colors hover:text-navy-800"
            >
              مشکل در ورود؟
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
