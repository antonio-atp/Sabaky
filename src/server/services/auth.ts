import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { burnPasswordCheck, hashPassword, isCommonPassword, needsRehash, verifyPassword } from "../auth/password";
import { createSession, revokeAllSessions } from "../auth/session";
import { hmac, randomToken, sha256 } from "../security/crypto";
import { email } from "../integrations/email";
import { templates } from "../integrations/email/templates";
import { audit } from "./audit";
import { notify } from "./notifications";
import { assessLoginFailure, flag } from "./risk";
import { mergeGuestCart } from "./cart";
import type { RegisterInput } from "@/shared/validation";
import type { Locale } from "@/shared/config/locales";

interface Meta {
  ipHash: string;
  userAgent: string;
}

const LOCK_THRESHOLD = 5;
const EMAIL_TOKEN_TTL = 24 * 3_600_000;
const RESET_TOKEN_TTL = 30 * 60_000;
export const TERMS_VERSION = "2026-09";

/** Exponential lockout: 5 fails → 1 min, 6 → 2 min … capped at 60 min. */
export function lockoutMinutes(failedCount: number) {
  if (failedCount < LOCK_THRESHOLD) return 0;
  return Math.min(60, 2 ** (failedCount - LOCK_THRESHOLD));
}

async function issueToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", ttl: number) {
  const token = randomToken(32);
  // Invalidate previous outstanding tokens of the same type.
  await db.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  await db.verificationToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttl) } });
  return token;
}

export async function register(input: RegisterInput, meta: Meta & { locale: Locale; guestCartToken?: string }) {
  if (isCommonPassword(input.password)) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { password: "validation.passwordCommon" });

  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    // Don't reveal registration status in the API message; the UI suggests login / reset.
    throw new AppError("CONFLICT", "errors.EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      locale: meta.locale,
      passwordChangedAt: new Date(),
      wishlist: { create: {} },
      consents: {
        create: [
          { purpose: "terms", granted: true, version: TERMS_VERSION },
          { purpose: "marketing", granted: input.marketingOptIn, version: TERMS_VERSION },
        ],
      },
      notificationPrefs: {
        create: [
          { type: "PROMOTION", channel: "EMAIL", enabled: input.marketingOptIn },
          { type: "PRICE_DROP", channel: "EMAIL", enabled: input.marketingOptIn },
        ],
      },
    },
  });

  // Fake-account heuristic: burst of registrations from one network.
  const recentFromIp = await db.auditLog.count({
    where: { action: "auth.register", ipHash: meta.ipHash, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (recentFromIp >= 3) await flag({ type: "FAKE_ACCOUNT", score: 40 + recentFromIp * 10, userId: user.id, details: { ipHash: meta.ipHash, burst: recentFromIp + 1 } });

  await audit("auth.register", { type: "User", id: user.id }, { actorId: user.id, ipHash: meta.ipHash });
  const token = await issueToken(user.id, "EMAIL_VERIFICATION", EMAIL_TOKEN_TTL);
  await email().send(templates.verifyEmail(user.email, user.name, token));

  const session = await createSession(user.id, meta);
  if (meta.guestCartToken) await mergeGuestCart(meta.guestCartToken, user.id);
  return { user, session };
}

export async function login(emailAddress: string, password: string, meta: Meta & { guestCartToken?: string }) {
  const emailHash = hmac(emailAddress);
  const user = await db.user.findUnique({ where: { email: emailAddress } });

  if (!user || user.status === "DELETED") {
    await burnPasswordCheck(password); // equalise timing
    await db.loginAttempt.create({ data: { emailHash, ipHash: meta.ipHash, success: false } });
    await assessLoginFailure(emailHash, meta.ipHash);
    throw new AppError("UNAUTHENTICATED", "errors.INVALID_CREDENTIALS");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError("ACCOUNT_LOCKED", "errors.ACCOUNT_LOCKED", { minutes: String(minutes) });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  await db.loginAttempt.create({ data: { emailHash, ipHash: meta.ipHash, success: valid } });

  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = lockoutMinutes(failed);
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: failed, lockedUntil: lock ? new Date(Date.now() + lock * 60_000) : null },
    });
    if (failed === LOCK_THRESHOLD) {
      await notify(user.id, { type: "SECURITY_ALERT", key: "accountLocked", href: "/forgot-password" });
      await audit("auth.lockout", { type: "User", id: user.id }, { ipHash: meta.ipHash, metadata: { failed } });
    }
    await assessLoginFailure(emailHash, meta.ipHash, user.id);
    throw new AppError("UNAUTHENTICATED", "errors.INVALID_CREDENTIALS");
  }

  if (user.status === "SUSPENDED") throw new AppError("FORBIDDEN", "errors.ACCOUNT_SUSPENDED");

  // New device/network → security alert (simple heuristic: unseen ipHash).
  const knownNetwork = await db.session.findFirst({ where: { userId: user.id, ipHash: meta.ipHash }, select: { id: true } });
  const hadSessions = await db.session.count({ where: { userId: user.id } });

  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      ...(needsRehash(user.passwordHash) ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  const session = await createSession(user.id, meta);
  if (hadSessions && !knownNetwork) await notify(user.id, { type: "SECURITY_ALERT", key: "newLogin", href: "/account/security" });
  await audit("auth.login", { type: "User", id: user.id }, { actorId: user.id, ipHash: meta.ipHash });
  if (meta.guestCartToken) await mergeGuestCart(meta.guestCartToken, user.id);
  return { user, session };
}

export async function resendVerification(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return;
  const token = await issueToken(user.id, "EMAIL_VERIFICATION", EMAIL_TOKEN_TTL);
  await email().send(templates.verifyEmail(user.email, user.name, token));
}

export async function verifyEmail(token: string) {
  const record = await db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "EMAIL_VERIFICATION" || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("BAD_REQUEST", "errors.TOKEN_INVALID");
  }
  await db.$transaction([
    db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  await audit("auth.email_verified", { type: "User", id: record.userId }, { actorId: record.userId });
}

/** Always resolves identically whether or not the account exists (no enumeration). */
export async function requestPasswordReset(emailAddress: string, meta: Meta) {
  const user = await db.user.findUnique({ where: { email: emailAddress } });
  if (!user || user.status !== "ACTIVE") return;
  const token = await issueToken(user.id, "PASSWORD_RESET", RESET_TOKEN_TTL);
  await email().send(templates.passwordReset(user.email, token));
  await audit("auth.password_reset_requested", { type: "User", id: user.id }, { ipHash: meta.ipHash });
}

export async function resetPassword(token: string, password: string, meta: Meta) {
  if (isCommonPassword(password)) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { password: "validation.passwordCommon" });
  const record = await db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("BAD_REQUEST", "errors.TOKEN_INVALID");
  }
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({
      where: { id: record.userId },
      // Proving control of the inbox also verifies the email address.
      data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null, emailVerifiedAt: new Date() },
    }),
  ]);
  await revokeAllSessions(record.userId); // kill any hijacked sessions
  await notify(record.userId, { type: "SECURITY_ALERT", key: "passwordChanged", href: "/account/security" });
  await audit("auth.password_reset", { type: "User", id: record.userId }, { ipHash: meta.ipHash });
}

export async function changePassword(userId: string, sessionId: string, current: string, next: string, meta: Meta) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, current))) {
    throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { currentPassword: "validation.wrongPassword" });
  }
  if (isCommonPassword(next)) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { newPassword: "validation.passwordCommon" });
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() } });
  await revokeAllSessions(userId, sessionId);
  await notify(userId, { type: "SECURITY_ALERT", key: "passwordChanged", href: "/account/security" });
  await audit("auth.password_changed", { type: "User", id: userId }, { actorId: userId, ipHash: meta.ipHash });
}
