import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { verifyPassword } from "../auth/password";
import { revokeAllSessions } from "../auth/session";
import { sha256 } from "../security/crypto";
import { audit } from "./audit";
import { TERMS_VERSION } from "./auth";
import type { AddressInput } from "@/shared/validation";
import type { NotificationChannel, NotificationType } from "@/generated/prisma/client";

// ── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, phone: true, locale: true, currency: true, countryCode: true, emailVerifiedAt: true, createdAt: true, roles: true },
  });
}

export async function updateProfile(userId: string, data: { name: string; phone: string | null; locale: string; currency: string; countryCode?: string | null }) {
  await db.user.update({ where: { id: userId }, data });
}

// ── Addresses (ownership enforced in every query) ───────────────────────────

export const listAddresses = (userId: string) => db.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });

export async function createAddress(userId: string, input: AddressInput) {
  const count = await db.address.count({ where: { userId } });
  if (count >= 20) throw new AppError("UNPROCESSABLE", "errors.ADDRESS_LIMIT");
  const isDefault = input.isDefault || count === 0;
  return db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, isDefault, userId } });
  });
}

export async function updateAddress(userId: string, id: string, input: AddressInput) {
  const existing = await db.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("NOT_FOUND");
  return db.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: { ...input, isDefault: input.isDefault || existing.isDefault } });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const res = await db.address.deleteMany({ where: { id, userId } });
  if (!res.count) throw new AppError("NOT_FOUND");
}

// ── Payment methods (tokens only) ───────────────────────────────────────────

export const listPaymentMethods = (userId: string) =>
  db.paymentMethod.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, type: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true, provider: true },
  });

export async function deletePaymentMethod(userId: string, id: string) {
  // Production: also detach at the provider (e.g. Stripe `payment_methods/:id/detach`).
  const res = await db.paymentMethod.deleteMany({ where: { id, userId } });
  if (!res.count) throw new AppError("NOT_FOUND");
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function listNotifications(userId: string, take = 50) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await db.notification.updateMany({ where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
}

export async function getNotificationPrefs(userId: string) {
  return db.notificationPreference.findMany({ where: { userId } });
}

export async function setNotificationPrefs(userId: string, prefs: { type: NotificationType; channel: NotificationChannel; enabled: boolean }[]) {
  await db.$transaction(
    prefs.map((p) =>
      db.notificationPreference.upsert({
        where: { userId_type_channel: { userId, type: p.type, channel: p.channel } },
        update: { enabled: p.enabled },
        create: { userId, ...p },
      }),
    ),
  );
}

// ── Sessions ────────────────────────────────────────────────────────────────

export const listSessions = (userId: string) =>
  db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true },
  });

// ── GDPR: consent, access (Art. 15/20), erasure (Art. 17) ───────────────────

export async function recordConsent(userId: string | null, consents: Record<string, boolean>, subjectId?: string) {
  await db.consentRecord.createMany({
    data: Object.entries(consents).map(([purpose, granted]) => ({ userId, subjectId: subjectId ?? null, purpose, granted, version: TERMS_VERSION })),
  });
}

export async function latestConsents(userId: string) {
  const rows = await db.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const latest: Record<string, boolean> = {};
  for (const r of rows) if (!(r.purpose in latest)) latest[r.purpose] = r.granted;
  return latest;
}

/** Machine-readable export of the personal data we hold (data portability). */
export async function exportUserData(userId: string, ipHash: string) {
  const data = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      phone: true,
      locale: true,
      currency: true,
      countryCode: true,
      createdAt: true,
      emailVerifiedAt: true,
      addresses: { select: { label: true, fullName: true, line1: true, line2: true, city: true, region: true, postalCode: true, countryCode: true, phone: true } },
      orders: { select: { number: true, status: true, total: true, placedAt: true, shippingAddress: true, items: { select: { title: true, variantName: true, quantity: true, unitPrice: true } } } },
      reviews: { select: { rating: true, title: true, body: true, createdAt: true, product: { select: { title: true } } } },
      questions: { select: { question: true, answer: true, createdAt: true } },
      wishlist: { select: { items: { select: { createdAt: true, product: { select: { title: true } } } } } },
      consents: { select: { purpose: true, granted: true, version: true, createdAt: true } },
      notificationPrefs: { select: { type: true, channel: true, enabled: true } },
      paymentMethods: { select: { type: true, brand: true, last4: true } },
    },
  });
  await db.privacyRequest.create({ data: { userId, type: "DATA_EXPORT", status: "COMPLETED", completedAt: new Date() } });
  await audit("privacy.export", { type: "User", id: userId }, { actorId: userId, ipHash });
  return { exportedAt: new Date().toISOString(), format: "sabaky-export-v1", data };
}

/**
 * Account deletion = anonymisation. Personal data is erased; order/payment
 * records required for tax & accounting law are kept but de-identified.
 */
export async function deleteAccount(userId: string, password: string, ipHash: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { seller: true } });
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { password: "validation.wrongPassword" });
  }
  const openOrders = await db.order.count({
    where: { userId, status: { in: ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } },
  });
  if (openOrders) throw new AppError("CONFLICT", "errors.DELETE_OPEN_ORDERS");
  if (user.seller && user.seller.status === "VERIFIED") throw new AppError("CONFLICT", "errors.DELETE_ACTIVE_SELLER");

  const anonEmail = `deleted+${sha256(user.id).slice(0, 16)}@deleted.sabaky.invalid`;
  await db.$transaction(async (tx) => {
    await tx.address.deleteMany({ where: { userId } });
    await tx.paymentMethod.deleteMany({ where: { userId } });
    await tx.cart.deleteMany({ where: { userId } });
    await tx.wishlist.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.notificationPreference.deleteMany({ where: { userId } });
    await tx.userEvent.deleteMany({ where: { userId } });
    await tx.productQuestion.deleteMany({ where: { userId, status: { not: "ANSWERED" } } });
    await tx.review.updateMany({ where: { userId }, data: { images: [] } });
    await tx.order.updateMany({ where: { userId }, data: { email: anonEmail, shippingAddress: { anonymised: true } } });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonEmail,
        name: "Deleted user",
        phone: null,
        passwordHash: "!",
        status: "DELETED",
        deletedAt: new Date(),
        emailVerifiedAt: null,
      },
    });
    await tx.privacyRequest.create({ data: { userId, type: "ACCOUNT_DELETION", status: "COMPLETED", completedAt: new Date() } });
  });
  await revokeAllSessions(userId);
  await audit("privacy.account_deleted", { type: "User", id: userId }, { actorId: userId, ipHash });
}
