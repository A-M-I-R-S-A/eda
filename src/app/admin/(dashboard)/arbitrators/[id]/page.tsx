import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArbitratorById, getPrincipalArbitrator } from "@/lib/db";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES, arbitratorPublicHref } from "@/lib/config/routes";
import { ArbitratorForm } from "@/components/admin/content-forms";
import { AdminPageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "ویرایش داور" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArbitratorPage({ params }: PageProps) {
  const { id } = await params;
  const [arbitrator, csrfToken, principal] = await Promise.all([
    getArbitratorById(id),
    getCsrfToken(),
    getPrincipalArbitrator({ publishedOnly: false }),
  ]);

  if (!arbitrator) notFound();

  const publicHref = arbitratorPublicHref(
    arbitrator.slug,
    principal?.id === arbitrator.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        backHref={ROUTES.admin.arbitrators}
        title={`ویرایش: ${arbitrator.fullName}`}
        description={arbitrator.title}
        actions={
          <ButtonLink
            href={publicHref}
            variant="outline"
            size="sm"
            icon="external"
            target="_blank"
          >
            مشاهده در وب‌سایت
          </ButtonLink>
        }
      />
      <ArbitratorForm csrfToken={csrfToken} arbitrator={arbitrator} />
    </div>
  );
}
