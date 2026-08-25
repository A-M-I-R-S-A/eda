import type { SessionPayload, UserRole } from "@/types";

/**
 * Role-based access control.
 *
 * Roles are deliberately *not* a ladder. An editor publishes pages but must
 * never read case operations; a manager works the appointment and enquiry
 * queues but must never reach settings, custom code or user administration.
 * Modelling that as "rank >= editor" would leak confidential case data to a
 * content role, so every gate asks for a capability instead.
 *
 * This module is Edge-compatible (no Node built-ins, no `server-only`) because
 * `proxy.ts` uses it for the first-pass gate.
 */

export type Permission =
  /** Pages, sections, articles, services, FAQ, categories, people, testimonials. */
  | "content"
  /** Upload, rename and delete media library files. */
  | "media"
  /** Enquiries, contact messages, appointments, newsletter. */
  | "operations"
  /** Site settings, header, footer, branding, SEO defaults. */
  | "settings"
  /** Custom CSS/JS, analytics and verification codes. */
  | "advanced"
  /** Administrator accounts and roles. */
  | "users"
  /** Audit log and revision history. */
  | "audit";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ["content", "media", "operations", "settings", "advanced", "users", "audit"],
  editor: ["content", "media", "audit"],
  manager: ["operations", "media", "audit"],
  client: [],
};

/** Roles that may reach the admin area at all. */
export const ADMIN_ROLES: UserRole[] = ["admin", "editor", "manager"];

export function permissionsFor(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function can(
  session: Pick<SessionPayload, "role"> | null | undefined,
  permission: Permission,
): boolean {
  if (!session) return false;
  return permissionsFor(session.role).includes(permission);
}

/** True when the session holds *every* listed permission. */
export function canAll(
  session: Pick<SessionPayload, "role"> | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => can(session, permission));
}

/** True when the session holds *any* of the listed permissions. */
export function canAny(
  session: Pick<SessionPayload, "role"> | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => can(session, permission));
}

export function isAdminRole(role: UserRole | undefined | null): boolean {
  return Boolean(role && ADMIN_ROLES.includes(role));
}

/**
 * Only the super administrator may hand out roles, and only these ones — a
 * `client` is a public visitor and is never assignable from the admin.
 */
export const ASSIGNABLE_ROLES: UserRole[] = ["admin", "editor", "manager"];
