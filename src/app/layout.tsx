import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSettings } from "@/lib/db";
import { SITE_URL } from "@/lib/seo/metadata";
import { BrandingStyles, CustomCode } from "@/components/layout/site-theme";

/**
 * Vazirmatn — a variable Persian typeface with excellent Latin coverage.
 *
 * Self-hosted (no Google Fonts request), subset per script, `display: swap`
 * and preloaded for the Arabic range that virtually all of the UI uses. The
 * Latin file is intentionally *not* preloaded: it only appears in phone
 * numbers and email addresses. It stays the fallback even when an
 * administrator sets a custom font stack, so Persian never loses its typeface.
 */
const vazirmatn = localFont({
  src: [
    {
      path: "../assets/fonts/vazirmatn-arabic-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../assets/fonts/vazirmatn-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: true,
  fallback: ["Segoe UI", "Tahoma", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

/**
 * Root metadata.
 *
 * The title template, description, verification codes and favicon are all CMS
 * values, so renaming the institution in the admin renames it in every browser
 * tab without a deploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const { seo, customCode } = settings;

  const verification: Record<string, string> = {};
  if (customCode.googleSiteVerification) {
    verification.google = customCode.googleSiteVerification;
  }
  if (customCode.bingSiteVerification) {
    verification.other = customCode.bingSiteVerification;
  }

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${settings.institutionName} | ${seo.defaultTitle}`,
      template: seo.titleTemplate.includes("%s")
        ? seo.titleTemplate
        : `%s | ${settings.institutionName}`,
    },
    description: seo.defaultDescription,
    applicationName: settings.institutionName,
    authors: [{ name: settings.institutionName, url: SITE_URL }],
    creator: settings.institutionName,
    publisher: settings.institutionName,
    formatDetection: { telephone: true, address: false, email: false },
    referrer: "strict-origin-when-cross-origin",
    category: "legal",
    ...(settings.faviconUrl
      ? { icons: { icon: settings.faviconUrl, apple: settings.faviconUrl } }
      : {}),
    ...(Object.keys(verification).length
      ? {
          verification: {
            google: verification.google,
            other: verification.other
              ? { "msvalidate.01": verification.other }
              : undefined,
          },
        }
      : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1428" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <html
      lang={settings.language || "fa"}
      dir={settings.direction || "rtl"}
      className={vazirmatn.variable}
    >
      <head>
        <BrandingStyles branding={settings.branding} />
        <CustomCode code={settings.customCode} position="head" />
      </head>
      <body className="min-h-dvh bg-paper antialiased">
        {children}
        <CustomCode code={settings.customCode} position="body" />
      </body>
    </html>
  );
}
