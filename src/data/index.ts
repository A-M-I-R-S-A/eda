import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import type { Database } from "@/lib/db/schema";
import { DB_VERSION } from "@/lib/db/schema";
import { SEED_ARBITRATORS } from "./arbitrators";
import { SEED_ARTICLES } from "./articles";
import { SEED_CATEGORIES, SEED_MEDIA, SEED_TESTIMONIALS } from "./cms-seed";
import { SEED_FAQS } from "./faqs";
import { SEED_PAGES } from "./pages";
import {
  buildSampleAppointments,
  buildSampleMessages,
  buildSampleRequests,
  buildSampleUsers,
} from "./samples";
import { SEED_SERVICES } from "./services";
import { SEED_SETTINGS } from "./settings";

export { SEED_ARBITRATORS } from "./arbitrators";
export { SEED_ARTICLES } from "./articles";
export { SEED_CATEGORIES, SEED_MEDIA, SEED_TESTIMONIALS } from "./cms-seed";
export { SEED_FAQS } from "./faqs";
export { SEED_PAGES } from "./pages";
export { SEED_SERVICES } from "./services";
export { SEED_SETTINGS } from "./settings";
export * from "./defaults";

/**
 * Builds the initial database.
 *
 * Called once, the first time the application starts against an empty
 * database. Everything here is designed to be safe on a public server:
 *
 *  • The administrator password comes from the environment and has no
 *    fallback in production. A shipped default password is a shipped
 *    vulnerability — the value would be in the repository, in the example
 *    env file, and in every deployment that forgot to change it.
 *
 *  • Exactly one account is created. Earlier revisions seeded an editor and a
 *    manager as well, all three sharing the administrator's password: two
 *    accounts the owner did not know existed, holding a password they did not
 *    know they had issued. Staff accounts are created from the admin panel,
 *    each with its own password.
 *
 *  • Demonstration enquiries are opt-in via `SEED_DEMO_DATA`. Invented client
 *    names, phone numbers and case histories have no business appearing in a
 *    law practice's live dashboard.
 */
export interface SeedOptions {
  /**
   * Allow a throwaway password instead of refusing to build without
   * `SEED_ADMIN_PASSWORD`.
   *
   * Only ever set by the build-time fallback in the store, which produces a
   * snapshot that is used to render metadata and then discarded — it is never
   * written to the database, so the credential it contains can never be used
   * to sign in.
   */
  ephemeral?: boolean;
}

export async function buildSeedDatabase(
  options: SeedOptions = {},
): Promise<Database> {
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL || "admin@dadavar-law.ir"
  ).toLowerCase();

  const adminPassword = options.ephemeral
    ? randomBytes(24).toString("base64url")
    : readSeedPassword();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(adminPassword);

  /**
   * Sample records are for evaluating the dashboard before real traffic
   * arrives. Off unless explicitly requested.
   */
  const withDemo = process.env.SEED_DEMO_DATA === "true";

  return {
    version: DB_VERSION,
    settings: { ...SEED_SETTINGS },

    pages: [...SEED_PAGES],
    media: [...SEED_MEDIA],
    services: [...SEED_SERVICES],
    arbitrators: [...SEED_ARBITRATORS],
    articles: [...SEED_ARTICLES],
    categories: [...SEED_CATEGORIES],
    testimonials: [...SEED_TESTIMONIALS],
    faqs: [...SEED_FAQS],

    requests: withDemo ? buildSampleRequests() : [],
    appointments: withDemo ? buildSampleAppointments() : [],
    messages: withDemo ? buildSampleMessages() : [],
    newsletter: [],

    revisions: [],
    auditLog: [],
    smsLog: [],

    users: [
      {
        id: "usr-admin",
        fullName: "مدیر سیستم",
        email: adminEmail,
        phone: "",
        role: "admin",
        status: "active",
        passwordHash,
        createdAt: now,
        updatedAt: now,
      },
      ...(withDemo ? buildSampleUsers() : []),
    ],
  };
}

/**
 * Resolves the first administrator's password.
 *
 * Refuses to start a production deployment without one rather than inventing
 * a credential that would then be the way into the panel.
 */
function readSeedPassword(): string {
  const supplied = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (supplied) {
    if (supplied.length < 10) {
      throw new Error(
        "SEED_ADMIN_PASSWORD is too short (minimum 10 characters).",
      );
    }
    return supplied;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required to initialise the database. " +
        "Set it to a strong password before first start.",
    );
  }

  console.warn(
    "[seed] SEED_ADMIN_PASSWORD is not set; using a development-only password.",
  );
  return "development-only-password";
}
