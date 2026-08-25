import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "پنل مدیریت", template: "%s | پنل مدیریت دادآور" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Bare wrapper for the whole admin area.
 *
 * The authenticated shell (sidebar, topbar) lives in `(dashboard)/layout.tsx`
 * so the login screen — which must render for signed-out visitors — is not
 * wrapped in it.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
