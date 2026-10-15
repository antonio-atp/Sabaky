import "server-only";
import { redirect } from "next/navigation";
import { AppError } from "../http/errors";
import { getCurrentUser, type SessionUser } from "./session";
import type { Role } from "@/generated/prisma/client";

/**
 * Role-based access control. Every check here runs on the server; UI hiding
 * is only cosmetic. Resource ownership checks live in the services
 * (e.g. an order is only readable by its customer, its sellers, or staff).
 */

export const hasRole = (user: Pick<SessionUser, "roles"> | null, ...roles: Role[]) =>
  !!user && roles.some((r) => user.roles.includes(r));

export const isStaff = (user: Pick<SessionUser, "roles"> | null) => hasRole(user, "ADMIN", "SUPPORT");

/** For API handlers: throws typed errors. */
export function assertRole(user: SessionUser | null, ...roles: Role[]): SessionUser {
  if (!user) throw new AppError("UNAUTHENTICATED");
  if (roles.length && !hasRole(user, ...roles)) throw new AppError("FORBIDDEN");
  return user;
}

/** For pages: redirects to login (preserving the return path) or home. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireRole(returnTo: string, ...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!hasRole(user, ...roles)) redirect("/?denied=1");
  return user;
}

/** Only allow same-origin relative redirects after login (prevents open redirects). */
export function safeReturnPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
