import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 * `unsafe-eval` is only allowed in development (React Refresh needs it).
 * Styles need `unsafe-inline` because Next injects critical CSS inline.
 */
/**
 * Analytics hosts allowed by the CSP.
 *
 * The admin panel lets an administrator paste a Google Analytics or Tag
 * Manager id, so the policy has to permit those hosts — otherwise the feature
 * would appear to save and then be silently blocked by the browser. Nothing
 * else is opened up: a script from any other origin is still refused.
 */
const ANALYTICS_HOSTS = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://region1.google-analytics.com",
].join(" ");

/**
 * Extra origins the operator has deliberately allowed.
 *
 * The advanced settings screen invites an administrator to paste an embed
 * code — a chat widget, an Instagram feed, a payment gateway. The policy
 * above would refuse every one of them, and the failure is invisible: the
 * snippet saves, the page renders, and the widget silently never appears.
 *
 * Rather than widen the policy for everyone or leave the feature broken, the
 * hosts are opt-in per deployment. Space-separated origins, e.g.
 *   CSP_SCRIPT_SRC="https://cdn.jsdelivr.net https://static.zarinpal.com"
 *   CSP_FRAME_SRC="https://www.aparat.com"
 *   CSP_CONNECT_SRC="https://api.example.ir"
 */
const extra = (name: string): string => {
  const value = process.env[name]?.trim();
  return value ? ` ${value}` : "";
};

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${ANALYTICS_HOSTS}${extra("CSP_SCRIPT_SRC")}${isProd ? "" : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline'${extra("CSP_STYLE_SRC")}`,
  // `img-src` covers analytics pixels; media files are served from our origin.
  `img-src 'self' data: blob: ${ANALYTICS_HOSTS}${extra("CSP_IMG_SRC")}`,
  `media-src 'self' blob:${extra("CSP_MEDIA_SRC")}`,
  `font-src 'self' data:${extra("CSP_FONT_SRC")}`,
  `connect-src 'self' ${ANALYTICS_HOSTS}${extra("CSP_CONNECT_SRC")}`,
  `frame-src 'self' https://www.openstreetmap.org https://www.googletagmanager.com${extra("CSP_FRAME_SRC")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  /**
   * Self-contained server bundle.
   *
   * Produces `.next/standalone/server.js` with only the traced dependencies
   * beside it. Two reasons this is the right target here:
   *
   *   • Shared Node hosts (cPanel/DirectAdmin via Passenger) start an app by
   *     running one file, not by running `next start`. Standalone gives them
   *     that file — and unlike a hand-written custom server, it is the real
   *     Next server, so `proxy.ts` and the rest still run.
   *   • It ships without `node_modules`, which matters on hosts that meter
   *     inode counts.
   *
   * `npm run build` copies `public/` and `.next/static` in afterwards; Next
   * deliberately leaves those out, expecting a CDN.
   */
  output: "standalone",

  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1200, 1600, 1920],
    imageSizes: [64, 96, 128, 192, 256, 384],
  },
  experimental: {
    optimizePackageImports: ["@/components/ui"],
  },
  /**
   * The institution has a single arbitrator, so the plural `/arbitrators`
   * directory was replaced by the singular `/arbitrator` profile. Anything
   * already pointing at the old paths — a bookmark, an inbound link, an
   * indexed URL — is sent to the profile permanently rather than 404ing.
   */
  async redirects() {
    return [
      { source: "/arbitrators", destination: "/arbitrator", permanent: true },
      {
        source: "/arbitrators/:slug",
        destination: "/arbitrator/:slug",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Long-lived immutable caching for static brand assets.
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Media library files are content-addressed by an unguessable id and
        // never reused, so the file at a given URL is immutable.
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
