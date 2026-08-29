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
   * Optional escape hatch for memory-constrained builds.
   *
   * `next build` runs a full TypeScript program in-process, which is a
   * substantial share of the build's peak memory. On a shared host with a low
   * cap that alone can be the difference between a build and an OOM kill.
   *
   * Off by default — types are checked on every build. Set
   * `NEXT_SKIP_TYPECHECK=true` only where `npm run typecheck` has already been
   * run separately, so the safety is moved rather than removed.
   */
  typescript: {
    ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "true",
  },

  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1200, 1600, 1920],
    imageSizes: [64, 96, 128, 192, 256, 384],
  },
  experimental: {
    /**
     * Cap build parallelism.
     *
     * Next sizes its page-data workers from the CPU count. On shared hosting
     * that number describes the *machine* — a cPanel box can report 31 cores —
     * while the memory ceiling applies to your account alone. The result is 31
     * Node processes against a fraction of the RAM, and the kernel's OOM killer
     * ends the build with a bare `Killed` and no explanation.
     *
     * Two is safe on a constrained host and still parallel. Raise it with
     * `NEXT_BUILD_CPUS` on a machine that has the memory to spare.
     */
    cpus: Math.max(1, Number(process.env.NEXT_BUILD_CPUS || 2)),

    /**
     * Child processes rather than worker threads: their memory is reclaimed
     * on exit instead of accumulating in one long-lived heap, which is what
     * keeps the peak under an account cap.
     */
    workerThreads: false,

    /**
     * Compile in the main process instead of a spawned build worker.
     *
     * The worker is a second Node process with its own heap, and on a capped
     * account that doubling is what the kernel notices. Keeping compilation
     * in-process also means `NODE_OPTIONS=--max-old-space-size` actually
     * governs the process doing the work, so V8 collects garbage rather than
     * growing past the ceiling and being killed.
     */
    webpackBuildWorker: false,
  },
  /**
   * Permanent homes for routes that were retired.
   *
   * A bookmark, an inbound link or an indexed URL keeps working instead of
   * 404ing, and search engines transfer the old URL's standing to the new one.
   *
   *   • `/arbitrators` — the institution has a single arbitrator, so the plural
   *     directory was replaced by the singular `/arbitrator` profile.
   *   • `/consultation` — the online request form was withdrawn; enquiries now
   *     go through the contact page.
   *
   * `/services` is deliberately absent: those pages had per-service URLs with
   * no successor, and folding a specific page into a generic one is worse for
   * a visitor than an honest 404.
   */
  async redirects() {
    return [
      { source: "/arbitrators", destination: "/arbitrator", permanent: true },
      {
        source: "/arbitrators/:slug",
        destination: "/arbitrator/:slug",
        permanent: true,
      },
      { source: "/consultation", destination: "/contact", permanent: true },
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
