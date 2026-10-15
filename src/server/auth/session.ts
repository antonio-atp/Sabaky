import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "../db";
import { env, isProd } from "../env";
import { randomToken, sha256 } from "../security/crypto";
import { COOKIE } from "@/lib/cookies";
import type { Role, UserStatus } from "@/generated/prisma/client";

/**
 * Opaque, server-side sessions.
 *  • 256-bit random token → only its SHA-256 is persisted.
 *  • Web: HttpOnly + Secure + SameSite=Lax cookie (`__Host-` prefixed in prod).
 *  • Native apps: same token sent as `Authorization: Bearer <token>`.
 *  • Sliding expiry; revocable individually or globally (password change).
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  status: UserStatus;
  emailVerified: boolean;
  locale: string;
  currency: string;
  sellerId: string | null;
  sessionId: string;
}

const TOUCH_INTERVAL_MS = 5 * 60_000;

export async function createSession(userId: string, meta: { userAgent?: string; ipHash?: string }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + env().SESSION_TTL_DAYS * 86_400_000);
  await db.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt, userAgent: meta.userAgent, ipHash: meta.ipHash },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(COOKIE.session, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE.session);
}

export async function revokeSession(sessionId: string) {
  await db.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}

async function resolveToken(token: string): Promise<SessionUser | null> {
  if (!token || token.length > 128) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          roles: true,
          status: true,
          emailVerifiedAt: true,
          locale: true,
          currency: true,
          seller: { select: { id: true } },
        },
      },
    },
  });
  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now) return null;
  if (session.user.status !== "ACTIVE") return null;

  if (now - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    // Sliding expiration — throttled so reads don't turn into writes on every request.
    const expiresAt = new Date(now + env().SESSION_TTL_DAYS * 86_400_000);
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(), expiresAt } }).catch(() => {});
  }

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    roles: u.roles,
    status: u.status,
    emailVerified: !!u.emailVerifiedAt,
    locale: u.locale,
    currency: u.currency,
    sellerId: u.seller?.id ?? null,
    sessionId: session.id,
  };
}

/** Current user for this request (memoised per request). Cookie or Bearer token. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) return resolveToken(auth.slice(7).trim());
  const token = (await cookies()).get(COOKIE.session)?.value;
  return token ? resolveToken(token) : null;
});

/** True when the request authenticated with a bearer token (native app / API client). */
export async function isBearerRequest() {
  return !!(await headers()).get("authorization")?.startsWith("Bearer ");
}
