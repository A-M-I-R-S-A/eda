import type { Metadata } from "next";
import { listMedia } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/current-user";
import { getCsrfToken } from "@/lib/security/csrf";
import { ROUTES } from "@/lib/config/routes";
import { formatBytes } from "@/lib/media/storage";
import { fa } from "@/lib/utils/persian";
import { AdminPageHeader, FilterSelect, FilterToolbar, Panel } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";
import { Pagination } from "@/components/ui/pagination";
import type { MediaKind } from "@/types";

export const metadata: Metadata = { title: "رسانه‌ها" };

const KIND_FILTERS = [
  { value: "", label: "همه فایل‌ها" },
  { value: "image", label: "تصاویر" },
  { value: "video", label: "ویدئو" },
  { value: "document", label: "اسناد" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
}

/**
 * Media library.
 *
 * The single place files live. Everywhere else in the CMS that takes an image
 * selects from here rather than uploading its own copy, which is what keeps
 * one logo from becoming six near-identical files.
 */
export default async function AdminMediaPage({ searchParams }: PageProps) {
  await requireAdminSession("media");

  const { q, kind, page } = await searchParams;
  const validKind = ["image", "video", "document", "other"].includes(kind ?? "")
    ? (kind as MediaKind)
    : "all";

  const [result, csrfToken] = await Promise.all([
    listMedia({
      search: q,
      kind: validKind,
      page: Math.max(1, Number(page) || 1),
      pageSize: 36,
    }),
    getCsrfToken(),
  ]);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kind) params.set("kind", kind);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${ROUTES.admin.media}?${query}` : ROUTES.admin.media;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="کتابخانه رسانه"
        description={`${fa(result.total)} فایل — مجموع ${formatBytes(result.totalBytes)}`}
      />

      <Panel bodyClassName="p-0">
        <FilterToolbar
          action={ROUTES.admin.media}
          searchValue={q ?? ""}
          searchPlaceholder="جست‌وجو بر اساس نام فایل…"
        >
          <FilterSelect
            name="kind"
            value={kind}
            label="فیلتر نوع فایل"
            options={KIND_FILTERS}
          />
        </FilterToolbar>

        <div className="p-5">
          <MediaLibrary items={result.items} csrfToken={csrfToken} />

          {result.totalPages > 1 && (
            <Pagination
              className="mt-8"
              page={result.page}
              totalPages={result.totalPages}
              hrefFor={hrefFor}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
