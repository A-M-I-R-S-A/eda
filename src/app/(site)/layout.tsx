import { getSettings } from "@/lib/db";
import { getCsrfToken } from "@/lib/security/csrf";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

/**
 * Public site shell.
 *
 * The header and footer are rendered entirely from `settings` — logo,
 * navigation, call-to-action, columns, contact block and copyright are all CMS
 * records. Organisation and WebSite structured data lives here so it is
 * emitted once per page load rather than repeated by every route.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, csrfToken] = await Promise.all([
    getSettings(),
    getCsrfToken(),
  ]);

  const firstHours = settings.workingHours[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={[organizationJsonLd(settings), websiteJsonLd(settings)]} />

      <SiteHeader
        header={settings.header}
        institutionName={settings.institutionName}
        institutionShortName={settings.institutionShortName}
        phone={settings.phones[0]}
        hoursLabel={
          firstHours ? `${firstHours.label}: ${firstHours.value}` : undefined
        }
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter settings={settings} csrfToken={csrfToken} />
    </div>
  );
}
