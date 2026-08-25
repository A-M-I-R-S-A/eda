import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceById } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { CONTENT_STATUS } from "@/lib/config/labels";
import { isLive } from "@/lib/cms/status";
import { ServiceForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "ویرایش خدمت" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: PageProps) {
  await requireAdminSession("content");

  const { id } = await params;
  const [service, csrfToken] = await Promise.all([
    getServiceById(id),
    getCsrfToken(),
  ]);

  if (!service) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.services}
        title={`ویرایش: ${service.title}`}
        description={CONTENT_STATUS[service.status].description}
        actions={
          <>
            <Link
              href={ROUTES.admin.serviceRevisions(service.id)}
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-line-2 px-3.5 text-[0.8125rem] font-medium text-navy-800 transition-colors hover:border-navy-900"
            >
              <Icon name="history" size={15} />
              تاریخچه
            </Link>
            {isLive(service) && (
              <ButtonLink
                href={ROUTES.service(service.slug)}
                variant="outline"
                size="sm"
                icon="external"
                target="_blank"
              >
                مشاهده در وب‌سایت
              </ButtonLink>
            )}
          </>
        }
      />
      <ServiceForm csrfToken={csrfToken} service={service} />
    </div>
  );
}
