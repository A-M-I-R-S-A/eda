"use client";

import { useEffect } from "react";
import { ROUTES } from "@/lib/config/routes";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

/** Error boundary scoped to the public site, so header and footer survive. */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[boundary] site error", error);
  }, [error]);

  return (
    <div className="container-x section">
      <div className="surface">
        <ErrorState
          title="نمایش این صفحه ممکن نشد"
          description="در دریافت اطلاعات این صفحه مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
          onRetry={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" icon="refresh" onClick={reset}>
                تلاش مجدد
              </Button>
              <ButtonLink href={ROUTES.contact} variant="outline">
                تماس با پشتیبانی
              </ButtonLink>
            </div>
          }
        />
      </div>
    </div>
  );
}
