import type { Metadata } from "next";
import Image from "next/image";
import { listArticles, listCategories } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import { CONTENT_STATUS, CONTENT_STATUS_OPTIONS } from "@/lib/config/labels";
import { getCsrfToken } from "@/lib/security/csrf";
import { requireAdminSession } from "@/lib/auth/current-user";
import { isPending } from "@/lib/cms/status";
import { deleteArticleAction } from "@/lib/actions/admin";
import { formatJalali } from "@/lib/utils/jalali";
import { fa, faNumber } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { ConfirmDelete } from "@/components/admin/actions";
import {
  AdminPageHeader,
  DataTable,
  FilterSelect,
  FilterToolbar,
  IconAction,
  Panel,
  RowActions,
  Td,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "مقالات" };

const STATUS_FILTERS = [
  { value: "", label: "همه وضعیت‌ها" },
  ...CONTENT_STATUS_OPTIONS,
];

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  await requireAdminSession("content");

  const { q, category, status, page } = await searchParams;
  const categories = await listCategories();

  const validCategory = categories.some((c) => c.slug === category)
    ? (category as string)
    : "all";

  const validStatus = CONTENT_STATUS_OPTIONS.some((s) => s.value === status)
    ? (status as "draft" | "published" | "scheduled" | "archived")
    : "all";

  const [result, csrfToken] = await Promise.all([
    listArticles({
      search: q,
      category: validCategory,
      status: validStatus,
      page: Math.max(1, Number(page) || 1),
      pageSize: 12,
    }),
    getCsrfToken(),
  ]);

  const categoryTitle = (slug: string) =>
    categories.find((entry) => entry.slug === slug)?.title ?? slug;

  const categoryFilters = [
    { value: "", label: "همه دسته‌ها" },
    ...categories.map((c) => ({ value: c.slug, label: c.title })),
  ];

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.articles}?${query}` : ROUTES.admin.articles;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="مقالات"
        description={`${faNumber(result.total)} مطلب در مرکز دانش حقوقی`}
        actions={
          <ButtonLink
            href={ROUTES.admin.articleNew}
            variant="primary"
            size="sm"
            icon="plus"
          >
            مقاله جدید
          </ButtonLink>
        }
      />

      <Panel bodyClassName="p-0">
        <FilterToolbar
          action={ROUTES.admin.articles}
          searchValue={q ?? ""}
          searchPlaceholder="جست‌وجو در عنوان، خلاصه و متن مقالات…"
        >
          <FilterSelect
            name="category"
            value={category}
            label="فیلتر دسته‌بندی"
            options={categoryFilters}
          />
          <FilterSelect
            name="status"
            value={status}
            label="فیلتر وضعیت"
            options={STATUS_FILTERS}
          />
        </FilterToolbar>

        {result.items.length === 0 ? (
          <EmptyState
            icon="article"
            title={q || category ? "مطلبی یافت نشد" : "هنوز مقاله‌ای ثبت نشده است"}
            description={
              q || category
                ? "فیلترها را تغییر دهید یا عبارت دیگری جست‌وجو کنید."
                : "نخستین مقاله را بنویسید تا مرکز دانش حقوقی فعال شود."
            }
            action={{ label: "مقاله جدید", href: ROUTES.admin.articleNew }}
          />
        ) : (
          <>
            <DataTable
              caption="فهرست مقالات"
              headers={[
                "عنوان",
                "دسته‌بندی",
                "نویسنده",
                "تاریخ انتشار",
                "زمان مطالعه",
                "وضعیت",
                "",
              ]}
            >
              {result.items.map((article) => (
                <tr key={article.id} className="transition-colors hover:bg-paper-2/50">
                  <Td>
                    <span className="flex items-center gap-3">
                      <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-xs bg-navy-900">
                        <Image
                          src={article.coverImage}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block max-w-[20rem] truncate font-medium text-navy-900">
                          {article.title}
                        </span>
                        <span dir="ltr" className="block text-[0.6875rem] text-muted-2">
                          /{article.slug}
                        </span>
                      </span>
                    </span>
                  </Td>
                  <Td nowrap>{categoryTitle(article.category)}</Td>
                  <Td nowrap>{article.authorName}</Td>
                  <Td nowrap className="tabular-nums">
                    {formatJalali(article.publishedAt)}
                  </Td>
                  <Td nowrap>{fa(article.readingMinutes)} دقیقه</Td>
                  <Td nowrap>
                    <span className="flex items-center gap-1.5">
                      <Badge
                        tone={CONTENT_STATUS[article.status].tone}
                        dot
                        size="sm"
                      >
                        {CONTENT_STATUS[article.status].label}
                      </Badge>
                      {isPending(article) && article.scheduledFor && (
                        <span
                          title={`انتشار در ${formatJalali(article.scheduledFor)}`}
                          className="text-[0.6875rem] text-muted-2 tabular-nums"
                        >
                          {formatJalali(article.scheduledFor)}
                        </span>
                      )}
                      {article.featured && (
                        <span title="مقاله ویژه">
                          <Icon name="check-circle" size={15} className="text-gold-600" />
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td nowrap>
                    <RowActions>
                      <IconAction
                        icon="external"
                        label="مشاهده در وب‌سایت"
                        href={ROUTES.article(article.slug)}
                      />
                      <IconAction
                        icon="edit"
                        label="ویرایش"
                        href={ROUTES.admin.articleEdit(article.id)}
                      />
                      <ConfirmDelete
                        action={deleteArticleAction}
                        csrfToken={csrfToken}
                        id={article.id}
                        label="حذف مقاله"
                      />
                    </RowActions>
                  </Td>
                </tr>
              ))}
            </DataTable>

            {result.totalPages > 1 && (
              <div className="border-t border-line px-5 py-5">
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  hrefFor={hrefFor}
                />
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
