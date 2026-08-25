import type { Metadata } from "next";
import type { FaqTopic } from "@/types";
import { listFaqs } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { FAQ_TOPIC } from "@/lib/config/labels";
import { getCsrfToken } from "@/lib/security/csrf";
import { getCurrentSession } from "@/lib/auth/current-user";
import { canManageSystem } from "@/lib/auth/session";
import { deleteFaqAction } from "@/lib/actions/admin";
import { fa, faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ConfirmDelete } from "@/components/admin/actions";
import {
  AdminPageHeader,
  IconAction,
  Panel,
  RowActions,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "پرسش‌های متداول" };

const TOPIC_ORDER: FaqTopic[] = ["arbitration", "process", "fees", "general"];

export default async function AdminFaqPage() {
  const [faqs, csrfToken, session] = await Promise.all([
    listFaqs(),
    getCsrfToken(),
    getCurrentSession(),
  ]);

  const isAdmin = canManageSystem(session);

  const groups = TOPIC_ORDER.map((topic) => ({
    topic,
    title: FAQ_TOPIC[topic],
    items: faqs.filter((f) => f.topic === topic),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="پرسش‌های متداول"
        description={`${faNumber(faqs.length)} پرسش ثبت‌شده`}
        actions={
          <ButtonLink href={ROUTES.admin.faqNew} variant="primary" size="sm" icon="plus">
            افزودن پرسش
          </ButtonLink>
        }
      />

      {faqs.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon="question"
            title="هنوز پرسشی ثبت نشده است"
            description="پرسش‌های متداول هم در صفحه اختصاصی و هم به‌صورت داده ساختاریافته در نتایج جست‌وجو منتشر می‌شوند."
            action={{ label: "افزودن پرسش", href: ROUTES.admin.faqNew }}
          />
        </Panel>
      ) : (
        groups.map((group) => (
          <Panel
            key={group.topic}
            title={group.title}
            description={`${faNumber(group.items.length)} پرسش`}
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-line">
              {group.items.map((faq) => (
                <li key={faq.id} className="flex items-start gap-4 p-5">
                  <span
                    aria-hidden="true"
                    className="mt-1 w-8 shrink-0 text-[0.75rem] font-semibold text-muted-2 tabular-nums"
                  >
                    {fa(String(faq.order).padStart(2, "0"))}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-[0.9375rem] font-semibold text-navy-900">
                        {faq.question}
                      </h3>
                      <Badge tone={faq.published ? "success" : "neutral"} dot size="sm">
                        {faq.published ? "منتشر شده" : "پیش‌نویس"}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-[1.95] text-muted">
                      {faq.answer}
                    </p>
                  </div>

                  <RowActions>
                    <IconAction
                      icon="edit"
                      label="ویرایش پرسش"
                      href={ROUTES.admin.faqEdit(faq.id)}
                    />
                    {isAdmin && (
                      <ConfirmDelete
                        action={deleteFaqAction}
                        csrfToken={csrfToken}
                        id={faq.id}
                        label="حذف پرسش"
                      />
                    )}
                  </RowActions>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}
    </div>
  );
}
