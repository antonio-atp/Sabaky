import "server-only";
import { db, type Tx } from "../db";
import { logger } from "../logger";
import type { Prisma, RiskType } from "@/generated/prisma/client";

/**
 * Fraud-prevention rules engine (v1: deterministic heuristics).
 *
 * Design principles:
 *  • Rules produce a score + a RiskEvent for human review in the admin panel.
 *  • Irreversible actions (bans, refunds denial) are never automatic; the only
 *    automatic controls are reversible and proportionate (temporary login
 *    lockout, holding an order for review).
 *  • The `assess*` functions are the seam where an ML model / third-party
 *    fraud service (e.g. Stripe Radar, Sift) can be plugged in later.
 */

export const REVIEW_THRESHOLD = 60;

interface FlagInput {
  type: RiskType;
  score: number;
  userId?: string | null;
  sellerId?: string | null;
  orderId?: string | null;
  details?: Prisma.InputJsonValue;
}

export async function flag(input: FlagInput, tx?: Tx) {
  const client = tx ?? db;
  try {
    // De-duplicate: one open event per subject+type per hour.
    const recent = await client.riskEvent.findFirst({
      where: {
        type: input.type,
        status: "OPEN",
        userId: input.userId ?? undefined,
        orderId: input.orderId ?? undefined,
        sellerId: input.sellerId ?? undefined,
        createdAt: { gte: new Date(Date.now() - 3_600_000) },
      },
      select: { id: true, score: true },
    });
    if (recent) {
      if (input.score > recent.score) await client.riskEvent.update({ where: { id: recent.id }, data: { score: input.score } });
      return;
    }
    await client.riskEvent.create({ data: { ...input, details: input.details ?? {} } });
  } catch (error) {
    logger.error("Risk flag failed", { type: input.type, error });
  }
}

/** Login: many failures from one IP across several accounts ⇒ credential stuffing. */
export async function assessLoginFailure(emailHash: string, ipHash: string, userId?: string) {
  const since = new Date(Date.now() - 15 * 60_000);
  const [ipFailures, distinctAccounts] = await Promise.all([
    db.loginAttempt.count({ where: { ipHash, success: false, createdAt: { gte: since } } }),
    db.loginAttempt.groupBy({ by: ["emailHash"], where: { ipHash, success: false, createdAt: { gte: since } } }),
  ]);
  if (distinctAccounts.length >= 5) {
    await flag({ type: "BRUTE_FORCE", score: Math.min(100, 50 + distinctAccounts.length * 5), details: { ipHash, accounts: distinctAccounts.length } });
  } else if (userId && ipFailures >= 8) {
    await flag({ type: "SUSPICIOUS_LOGIN", score: 55, userId, details: { ipHash, failures: ipFailures, emailHash } });
  }
}

/** Order heuristics evaluated at checkout. Returns a 0–100 score. */
export async function assessOrder(input: {
  userId: string;
  total: number;
  itemCount: number;
  accountAgeMs: number;
  emailVerified: boolean;
  shippingCountry: string;
}): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 0;
  const hourAgo = new Date(Date.now() - 3_600_000);
  const [recentOrders, recentFailedPayments] = await Promise.all([
    db.order.count({ where: { userId: input.userId, placedAt: { gte: hourAgo } } }),
    db.payment.count({ where: { order: { userId: input.userId }, status: "FAILED", createdAt: { gte: hourAgo } } }),
  ]);

  if (input.accountAgeMs < 3_600_000 && input.total > 50_000) {
    score += 30;
    reasons.push("new_account_high_value");
  }
  if (!input.emailVerified) {
    score += 10;
    reasons.push("email_unverified");
  }
  if (recentOrders >= 5) {
    score += 30;
    reasons.push("order_velocity");
  }
  if (recentFailedPayments >= 3) {
    score += 30;
    reasons.push("payment_failures");
  }
  if (input.itemCount >= 30) {
    score += 15;
    reasons.push("bulk_quantity");
  }
  if (input.total > 300_000) {
    score += 20;
    reasons.push("very_high_value");
  }

  return { score: Math.min(100, score), reasons };
}

export async function recordPaymentFailure(userId: string, orderId: string) {
  const failures = await db.payment.count({
    where: { order: { userId }, status: "FAILED", createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (failures >= 3) await flag({ type: "PAYMENT_FAILURES", score: Math.min(100, 40 + failures * 10), userId, orderId, details: { failures } });
}

/** Coupon abuse: same coupon redeemed by many new accounts sharing an IP is checked upstream; here per-user velocity. */
export async function assessCouponUse(userId: string, couponId: string) {
  const uses = await db.couponRedemption.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } });
  if (uses >= 5) await flag({ type: "COUPON_ABUSE", score: 50 + uses * 5, userId, details: { couponId, weeklyRedemptions: uses } });
}

/** Refund abuse: high refund ratio over the last 90 days. */
export async function assessRefundRequest(userId: string, orderId: string) {
  const since = new Date(Date.now() - 90 * 86_400_000);
  const [orders, refunds] = await Promise.all([
    db.order.count({ where: { userId, placedAt: { gte: since } } }),
    db.returnRequest.count({ where: { userId, createdAt: { gte: since } } }),
  ]);
  if (refunds >= 3 && refunds / Math.max(orders, 1) > 0.5) {
    await flag({ type: "REFUND_ABUSE", score: Math.min(100, 40 + refunds * 8), userId, orderId, details: { orders, refunds } });
  }
}
