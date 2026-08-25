import type { Metadata } from "next";
import { listTestimonials } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { fa } from "@/lib/utils/persian";
import { AdminPageHeader } from "@/components/admin/ui";
import { TestimonialManager } from "@/components/admin/testimonial-manager";

export const metadata: Metadata = { title: "نظرات" };

export default async function AdminTestimonialsPage() {
  await requireAdminSession("content");

  const [testimonials, csrfToken] = await Promise.all([
    listTestimonials(),
    getCsrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="نظرات"
        description={`${fa(testimonials.length)} نظر ثبت‌شده`}
      />
      <TestimonialManager testimonials={testimonials} csrfToken={csrfToken} />
    </div>
  );
}
