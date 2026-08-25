import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFaqById, listFaqTopics } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { FaqForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "ویرایش پرسش" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFaqPage({ params }: PageProps) {
  await requireAdminSession("content");

  const { id } = await params;
  const [faq, csrfToken, topics] = await Promise.all([
    getFaqById(id),
    getCsrfToken(),
    listFaqTopics(),
  ]);

  if (!faq) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.faq}
        title="ویرایش پرسش متداول"
        description={faq.question}
      />
      <FaqForm csrfToken={csrfToken} faq={faq} topics={topics} />
    </div>
  );
}
