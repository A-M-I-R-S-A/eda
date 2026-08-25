import type { Metadata } from "next";
import Link from "next/link";
import {
  getDashboardStats,
  listAppointments,
  listRecentActivity,
  listRequests,
} from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { ROUTES } from "@/lib/config/routes";
import {
  APPOINTMENT_STATUS,
  AUDIT_ACTION,
  AUDIT_ENTITY,
  MEETING_MODE,
  REQUEST_STATUS,
  REQUEST_TYPE,
  USER_ROLE,
} from "@/lib/config/labels";
import { formatBytes } from "@/lib/media/storage";
import { cn } from "@/lib/utils/cn";
import { formatJalali, formatJalaliShort, formatRelative } from "@/lib/utils/jalali";
import { fa, faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { BarChart, DonutChart } from "@/components/admin/charts";
import {
  AdminPageHeader,
  DataTable,
  IconAction,
  Panel,
  RowActions,
  StatTile,
  Td,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "نمای کلی" };

/**
 * The dashboard.
 *
 * Built around what each role can actually act on: an editor sees the state of
 * the site's content, a manager sees the queues, and the super administrator
 * sees both. Rendering an operations panel to someone who cannot open a single
 * row in it would be decoration, not information.
 */

interface QuickAction {
  href: string;
  label: string;
  icon: IconName;
  permission: Parameters<typeof can>[1];
}

const QUICK_ACTIONS: QuickAction[] = [
  { href: ROUTES.admin.pageNew, label: "صفحه جدید", icon: "layers", permission: "content" },
  { href: ROUTES.admin.articleNew, label: "مقاله جدید", icon: "article", permission: "content" },
  { href: ROUTES.admin.serviceNew, label: "خدمت جدید", icon: "briefcase", permission: "content" },
  { href: ROUTES.admin.faqNew, label: "پرسش متداول", icon: "question", permission: "content" },
  { href: ROUTES.admin.media, label: "بارگذاری رسانه", icon: "image", permission: "media" },
  { href: ROUTES.admin.navigation, label: "ویرایش منو", icon: "link", permission: "settings" },
  { href: ROUTES.admin.branding, label: "هویت بصری", icon: "palette", permission: "settings" },
  { href: ROUTES.admin.seo, label: "تنظیمات سئو", icon: "search", permission: "settings" },
];

export default async function AdminOverviewPage() {
  const session = await requireAdminSession();

  const showOperations = can(session, "operations");
  const showContent = can(session, "content");

  const [stats, todayAppointments, recentRequests, activity] = await Promise.all([
    getDashboardStats(),
    showOperations
      ? listAppointments({ scope: "today", pageSize: 6 })
      : Promise.resolve(null),
    showOperations ? listRequests({ pageSize: 5 }) : Promise.resolve(null),
    can(session, "audit") ? listRecentActivity(8) : Promise.resolve([]),
  ]);

  const requestChartData = stats.requestsByStatus
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      label: REQUEST_STATUS[entry.status].label,
      value: entry.count,
    }));

  const weeklyData = stats.weeklyRequests.map((week) => ({
    label: formatJalaliShort(week.iso).slice(3), // day/month only
    value: week.value,
  }));

  const actions = QUICK_ACTIONS.filter((action) => can(session, action.permission));

  /**
   * Things that need a human decision, gathered in one place. Only genuine
   * blockers appear — an empty list means there is nothing to do, which is
   * information in itself rather than a panel to be padded out.
   */
  const attention: { label: string; href: string; count: number; icon: IconName }[] = [
    ...(showOperations
      ? [
          {
            label: "درخواست بررسی‌نشده",
            href: `${ROUTES.admin.requests}?status=submitted`,
            count: stats.newRequests,
            icon: "inbox" as IconName,
          },
          {
            label: "پیام خوانده‌نشده",
            href: ROUTES.admin.messages,
            count: stats.unreadMessages,
            icon: "mail" as IconName,
          },
        ]
      : []),
    ...(showContent
      ? [
          {
            label: "پیش‌نویس منتشرنشده",
            href: `${ROUTES.admin.articles}?status=draft`,
            count: stats.draftArticles + stats.draftPages,
            icon: "edit" as IconName,
          },
          {
            label: "محتوای زمان‌بندی‌شده",
            href: `${ROUTES.admin.articles}?status=scheduled`,
            count: stats.scheduledArticles,
            icon: "clock" as IconName,
          },
        ]
      : []),
  ].filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`خوش آمدید، ${session.name}`}
        description={`${USER_ROLE[session.role]} — ${formatJalali(new Date())}`}
        actions={
          <ButtonLink href="/" variant="outline" size="sm" icon="external" target="_blank">
            مشاهده وب‌سایت
          </ButtonLink>
        }
      />

      {/* -- needs attention ------------------------------------------------ */}
      {attention.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {attention.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-2.5 rounded-sm border border-gold-300 bg-gold-50 px-4 py-2.5 transition-colors hover:bg-gold-100"
            >
              <Icon name={item.icon} size={16} className="text-gold-700" />
              <span className="text-[0.875rem] text-navy-900">
                <span className="font-bold tabular-nums">{faNumber(item.count)}</span>{" "}
                {item.label}
              </span>
              <Icon
                name="arrow-forward"
                size={14}
                className="text-gold-700 transition-transform group-hover:-translate-x-1"
              />
            </Link>
          ))}
        </div>
      )}

      {/* -- content figures ------------------------------------------------ */}
      {showContent && (
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="صفحات سایت"
            value={stats.totalPages}
            icon="layers"
            href={ROUTES.admin.pages}
            hint={`${faNumber(stats.publishedPages)} صفحه منتشر شده`}
          />
          <StatTile
            label="مقالات"
            value={stats.totalArticles}
            icon="article"
            href={ROUTES.admin.articles}
            hint={`${faNumber(stats.publishedArticles)} مقاله منتشر شده`}
          />
          <StatTile
            label="خدمات فعال"
            value={stats.totalServices}
            icon="briefcase"
            href={ROUTES.admin.services}
          />
          <StatTile
            label="فایل‌های رسانه"
            value={stats.totalMedia}
            icon="image"
            href={ROUTES.admin.media}
            hint={`مجموع ${formatBytes(stats.mediaBytes)}`}
          />
        </div>
      )}

      {/* -- operations figures --------------------------------------------- */}
      {showOperations && (
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="درخواست‌های جدید"
            value={stats.newRequests}
            icon="inbox"
            href={ROUTES.admin.requests}
            tone={stats.newRequests > 0 ? "accent" : "default"}
            hint={`${faNumber(stats.pendingRequests)} مورد در انتظار بررسی`}
          />
          <StatTile
            label="نوبت‌های امروز"
            value={stats.todayAppointments}
            icon="calendar"
            href={ROUTES.admin.appointmentCalendar}
          />
          <StatTile
            label="نوبت‌های آینده"
            value={stats.upcomingAppointments}
            icon="clock"
            href={`${ROUTES.admin.appointments}?scope=upcoming`}
          />
          <StatTile
            label="مشترکان خبرنامه"
            value={stats.newsletterSubscribers}
            icon="send"
            href={ROUTES.admin.newsletter}
          />
        </div>
      )}

      {/* -- quick actions --------------------------------------------------- */}
      {actions.length > 0 && (
        <Panel title="دسترسی سریع">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 rounded-sm border border-line-2 bg-white px-4 py-3 transition-colors hover:border-navy-500 hover:bg-paper-2/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-line-2 text-navy-700 transition-colors group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-gold-200">
                  <Icon name={action.icon} size={17} />
                </span>
                <span className="min-w-0 truncate text-[0.875rem] font-medium text-navy-900">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      {/* -- operational detail ---------------------------------------------- */}
      {showOperations && recentRequests && todayAppointments && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="روند درخواست‌ها"
              description="هشت هفته گذشته"
            >
              {weeklyData.some((week) => week.value > 0) ? (
                <BarChart data={weeklyData} label="تعداد درخواست‌ها در هر هفته" />
              ) : (
                <p className="py-8 text-center text-[0.875rem] text-muted">
                  در هشت هفته گذشته درخواستی ثبت نشده است.
                </p>
              )}
            </Panel>

            <Panel title="وضعیت درخواست‌ها">
              {requestChartData.length > 0 ? (
                <DonutChart
                  data={requestChartData}
                  label="توزیع درخواست‌ها بر اساس وضعیت"
                  centerLabel="مجموع"
                  centerValue={faNumber(
                    requestChartData.reduce((sum, item) => sum + item.value, 0),
                  )}
                />
              ) : (
                <p className="py-8 text-center text-[0.875rem] text-muted">
                  هنوز درخواستی ثبت نشده است.
                </p>
              )}
            </Panel>
          </div>

          <Panel
            title="نوبت‌های امروز"
            description={formatJalali(new Date())}
            bodyClassName="p-0"
            actions={
              <ButtonLink
                href={ROUTES.admin.appointmentCalendar}
                variant="ghost"
                size="sm"
                icon="calendar"
              >
                نمای تقویم
              </ButtonLink>
            }
          >
            {todayAppointments.items.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="امروز نوبتی ثبت نشده است"
                description="نوبت‌های تأییدشده امروز در این بخش نمایش داده می‌شوند."
              />
            ) : (
              <DataTable
                caption="نوبت‌های امروز"
                headers={["ساعت", "مراجع", "نوع جلسه", "شیوه", "وضعیت", ""]}
              >
                {todayAppointments.items.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="transition-colors hover:bg-paper-2/50"
                  >
                    <Td nowrap>
                      <span dir="ltr" className="font-bold text-navy-900 tabular-nums">
                        {fa(appointment.time)}
                      </span>
                    </Td>
                    <Td nowrap>
                      <span className="block font-medium text-navy-900">
                        {appointment.fullName}
                      </span>
                      <span dir="ltr" className="block text-[0.6875rem] text-muted-2">
                        {appointment.phone}
                      </span>
                    </Td>
                    <Td nowrap>{appointment.consultationType}</Td>
                    <Td nowrap>{MEETING_MODE[appointment.meetingMode].label}</Td>
                    <Td nowrap>
                      <Badge
                        tone={APPOINTMENT_STATUS[appointment.status].tone}
                        dot
                        size="sm"
                      >
                        {APPOINTMENT_STATUS[appointment.status].label}
                      </Badge>
                    </Td>
                    <Td nowrap>
                      <RowActions>
                        <IconAction
                          icon="eye"
                          label="مشاهده جزئیات"
                          href={ROUTES.admin.appointment(appointment.id)}
                        />
                      </RowActions>
                    </Td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>

          <Panel
            title="آخرین درخواست‌ها"
            bodyClassName="p-0"
            actions={
              <ButtonLink href={ROUTES.admin.requests} variant="ghost" size="sm">
                همه درخواست‌ها
              </ButtonLink>
            }
          >
            {recentRequests.items.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="هنوز درخواستی ثبت نشده است"
                description="درخواست‌های ارسالی از فرم مشاوره در این بخش نمایش داده می‌شوند."
              />
            ) : (
              <DataTable
                caption="آخرین درخواست‌ها"
                headers={["کد پیگیری", "متقاضی", "نوع", "تاریخ", "وضعیت", ""]}
              >
                {recentRequests.items.map((request) => (
                  <tr key={request.id} className="transition-colors hover:bg-paper-2/50">
                    <Td nowrap>
                      <span dir="ltr" className="font-mono text-[0.75rem] text-navy-900">
                        {request.trackingCode}
                      </span>
                    </Td>
                    <Td nowrap>
                      <span className="block font-medium text-navy-900">
                        {request.fullName}
                      </span>
                    </Td>
                    <Td nowrap>{REQUEST_TYPE[request.requestType]}</Td>
                    <Td nowrap>
                      <span className="text-[0.75rem] text-muted">
                        {formatRelative(request.createdAt)}
                      </span>
                    </Td>
                    <Td nowrap>
                      <Badge
                        tone={REQUEST_STATUS[request.status].tone}
                        dot
                        size="sm"
                      >
                        {REQUEST_STATUS[request.status].label}
                      </Badge>
                    </Td>
                    <Td nowrap>
                      <RowActions>
                        <IconAction
                          icon="eye"
                          label="مشاهده جزئیات"
                          href={ROUTES.admin.request(request.id)}
                        />
                      </RowActions>
                    </Td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </>
      )}

      {/* -- recent activity -------------------------------------------------- */}
      {activity.length > 0 && (
        <Panel
          title="آخرین فعالیت‌ها"
          description="تغییرات اخیر در پنل مدیریت"
          actions={
            <ButtonLink href={ROUTES.admin.audit} variant="ghost" size="sm">
              گزارش کامل
            </ButtonLink>
          }
        >
          <ol className="flex flex-col">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 border-b border-line py-3 last:border-0"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
                    entry.action === "delete"
                      ? "border-danger/25 bg-danger-soft text-danger"
                      : entry.action === "create"
                        ? "border-success/25 bg-success-soft text-success"
                        : "border-line-2 text-muted",
                  )}
                >
                  <Icon
                    name={
                      entry.action === "delete"
                        ? "trash"
                        : entry.action === "create"
                          ? "plus"
                          : "edit"
                    }
                    size={14}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] text-ink-2">
                    <span className="font-semibold text-navy-900">
                      {entry.actorName}
                    </span>{" "}
                    {AUDIT_ACTION[entry.action].label} — {AUDIT_ENTITY[entry.entity]}{" "}
                    <span className="text-navy-800">«{entry.entityLabel}»</span>
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted-2">
                    {formatRelative(entry.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
