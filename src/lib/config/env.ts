/**
 * Startup environment validation.
 *
 * A misconfigured production deployment should fail loudly at boot, not
 * quietly at 2am when the first client tries to submit a case. The checks
 * below split into two kinds:
 *
 *   • **fatal** — the application cannot serve correctly. Missing database
 *     credentials, a weak session secret. These throw.
 *   • **warnings** — a feature will silently not work. SMS enabled with no
 *     API key, a site URL still pointing at the placeholder domain. These are
 *     logged so the operator can see them in the process output.
 *
 * Development is deliberately lenient: `npm run dev` must work on a fresh
 * clone without a full production configuration.
 */

export interface EnvReport {
  errors: string[];
  warnings: string[];
}

const PLACEHOLDER_SECRETS = [
  "replace-me-with-a-long-random-secret-at-least-32-chars",
  "development-only-insecure-key-do-not-use-in-production",
];

export function checkEnvironment(): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  /* -- database ---------------------------------------------------------- */

  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const hasDbParts = Boolean(process.env.DB_HOST && process.env.DB_NAME);

  if (!hasDbUrl && !hasDbParts) {
    errors.push(
      "DATABASE_URL (or DB_HOST + DB_NAME + DB_USER + DB_PASSWORD) is not set. The application cannot start without a database.",
    );
  }

  if (hasDbUrl) {
    try {
      const url = new URL(process.env.DATABASE_URL!);
      if (!url.pathname.replace(/^\//, "")) {
        errors.push("DATABASE_URL does not name a database.");
      }
    } catch {
      errors.push("DATABASE_URL is not a valid connection URL.");
    }
  }

  /* -- session secret ---------------------------------------------------- */

  const secret = process.env.AUTH_SECRET ?? "";

  if (!secret) {
    (isProd ? errors : warnings).push(
      "AUTH_SECRET is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  } else if (secret.length < 32) {
    (isProd ? errors : warnings).push(
      "AUTH_SECRET is shorter than 32 characters.",
    );
  } else if (PLACEHOLDER_SECRETS.includes(secret)) {
    (isProd ? errors : warnings).push(
      "AUTH_SECRET is still the placeholder value from .env.example.",
    );
  }

  /* -- site URL ---------------------------------------------------------- */

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    warnings.push(
      "NEXT_PUBLIC_SITE_URL is not set; canonical URLs, the sitemap and Open Graph images will use the built-in default. Note this value is inlined at BUILD time — it must be present when `npm run build` runs, not only at start.",
    );
  } else if (isProd && !siteUrl.startsWith("https://")) {
    warnings.push("NEXT_PUBLIC_SITE_URL is not an https:// address.");
  }

  /* -- storage ----------------------------------------------------------- */

  /**
   * Read with static property access, never `process.env[name]`.
   *
   * A bundler can only reason about `process.env.FOO` written out literally.
   * With a computed key it may substitute a partial environment object, and
   * the variable reads as unset even though it is plainly there in the file —
   * which produced a confident, wrong warning telling an operator to fix a
   * path that was already correct.
   */
  const storage = [
    {
      name: "UPLOAD_DIR",
      value: process.env.UPLOAD_DIR,
      purpose: "client case documents",
    },
    {
      name: "MEDIA_DIR",
      value: process.env.MEDIA_DIR,
      purpose: "media library files",
    },
  ];

  for (const { name, value, purpose } of storage) {
    if (isProd && (!value || value.startsWith("."))) {
      warnings.push(
        `${name} is unset or relative, so ${purpose} are stored inside the application directory and will be lost on the next deploy. Point it at an absolute path outside the deploy directory.`,
      );
    }
  }

  /* -- SMS --------------------------------------------------------------- */

  /**
   * Only the OTP template id lives in the environment.
   *
   * The staff-alert and client-update template ids are configured in the admin
   * panel — they are not secrets, and the office changes them when sms.ir
   * approves a new template, which should not require a deploy.
   */
  if (process.env.SMSIR_API_KEY && !process.env.SMSIR_OTP_TEMPLATE_ID) {
    warnings.push(
      "SMSIR_OTP_TEMPLATE_ID is not set; phone verification codes cannot be sent.",
    );
  }

  return { errors, warnings };
}

/**
 * Runs the checks and throws on anything fatal.
 *
 * Called from `instrumentation.ts`, which Next runs once per server process
 * before the first request is handled.
 */
export function assertEnvironment(): void {
  const { errors, warnings } = checkEnvironment();

  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }

  if (errors.length) {
    const detail = errors.map((line) => `  • ${line}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }
}
