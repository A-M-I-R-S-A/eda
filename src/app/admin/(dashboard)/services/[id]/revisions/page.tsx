import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServiceById, listRevisions } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { restoreServiceRevisionAction } from "@/lib/actions/revisions";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import {
  EntityRevisions,
  SERVICE_REVISION_FIELDS,
} from "@/components/admin/entity-revisions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const service = await getServiceById(id);
  return { title: service ? `تاریخچه ${service.title}` : "تاریخچه خدمت" };
}

export default async function ServiceRevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession("content");

  const { id } = await params;
  const [service, csrfToken] = await Promise.all([
    getServiceById(id),
    getCsrfToken(),
  ]);
  if (!service) notFound();

  const revisions = await listRevisions("service", service.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.serviceEdit(service.id)}
        title={`تاریخچه: ${service.title}`}
        description="نسخه‌های پیشین این خدمت. می‌توانید تغییرات را مقایسه کرده و هر نسخه را بازگردانید."
      />

      <Panel
        title="تاریخچه نسخه‌ها"
        description="پیش از هر ذخیره‌سازی، وضعیت قبلی خدمت به‌صورت خودکار نگهداری می‌شود."
      >
        <EntityRevisions
          current={service as unknown as Record<string, unknown>}
          revisions={revisions}
          fields={SERVICE_REVISION_FIELDS}
          action={restoreServiceRevisionAction}
          csrfToken={csrfToken}
        />
      </Panel>
    </div>
  );
}
