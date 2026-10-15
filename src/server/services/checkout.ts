import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { payments } from "../integrations/payments";
import type { BankTransferInstructions } from "../integrations/payments/types";
import type { SessionUser } from "../auth/session";
import { applyBps } from "@/shared/money";
import { buildCart, findCart, loadCoupon } from "./cart";
import { computeTotals, deliveryWindow } from "./pricing";
import { generateOrderNumber, restock } from "./orders";
import { audit } from "./audit";
import { notify } from "./notifications";
import { REVIEW_THRESHOLD, assessCouponUse, assessOrder, flag, recordPaymentFailure } from "./risk";
import { trackEvent } from "./recommendations";
import type { CheckoutInput } from "@/shared/validation";
import type { Prisma } from "@/generated/prisma/client";

export type PlaceOrderResult =
  | { status: "confirmed" | "pending_payment"; orderNumber: string; bankTransfer?: BankTransferInstructions }
  | { status: "requires_action"; orderNumber: string; redirectUrl: string };

/**
 * Checkout orchestration:
 *  1. Idempotency (double-click / retry safe).
 *  2. Re-price the cart from the DB (never trust client totals).
 *  3. Atomically decrement stock + create order, items, shipments (1 tx).
 *  4. Call the payment provider *outside* the transaction.
 *  5. Confirm or roll back (restock) depending on the payment result.
 */
export async function placeOrder(user: SessionUser, input: CheckoutInput, meta: { ipHash: string; currency: string; exchangeRate: number }): Promise<PlaceOrderResult> {
  const existing = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { order: true } });
  if (existing) {
    if (existing.order.userId !== user.id) throw new AppError("CONFLICT");
    return { status: existing.status === "CAPTURED" ? "confirmed" : "pending_payment", orderNumber: existing.order.number };
  }

  // ── Address ────────────────────────────────────────────────────────────────
  let address: Prisma.InputJsonObject;
  if (input.addressId) {
    const a = await db.address.findFirst({ where: { id: input.addressId, userId: user.id } });
    if (!a) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { addressId: "validation.invalid" });
    address = { fullName: a.fullName, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, countryCode: a.countryCode, phone: a.phone };
  } else {
    const a = input.address!;
    address = { fullName: a.fullName, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, countryCode: a.countryCode, phone: a.phone };
    if (input.saveAddress) {
      const count = await db.address.count({ where: { userId: user.id } });
      await db.address.create({ data: { ...a, userId: user.id, isDefault: count === 0 } });
    }
  }
  const country = String(address.countryCode);

  // ── Cart re-pricing ────────────────────────────────────────────────────────
  const cartRow = await findCart({ userId: user.id, guestToken: null });
  if (!cartRow) throw new AppError("UNPROCESSABLE", "errors.CART_EMPTY");
  const cart = await buildCart(cartRow.id, user.id, { country, deliveryMethod: input.deliveryMethod });
  if (!cart.lines.length) throw new AppError("UNPROCESSABLE", "errors.CART_EMPTY");
  if (cart.lines.some((l) => l.issue)) throw new AppError("OUT_OF_STOCK", "errors.CART_HAS_ISSUES");
  if (cart.coupon && !cart.coupon.applied) throw new AppError("UNPROCESSABLE", "errors.COUPON_NOT_APPLICABLE");
  const couponRecord = cart.couponCode && cart.coupon?.applied ? await loadCoupon(cart.couponCode, user.id) : null;
  const couponId = couponRecord && "coupon" in couponRecord ? couponRecord.coupon.id : null;

  // Re-run the pricing engine with seller commission data for per-line discount allocation.
  const sellerRows = await db.seller.findMany({
    where: { id: { in: [...new Set(cart.lines.map((l) => l.seller.id))] } },
    select: { id: true, commissionBps: true, freeShippingThreshold: true, handlingDays: true, userId: true },
  });
  const sellerMap = Object.fromEntries(sellerRows.map((s) => [s.id, s]));
  const productRows = await db.product.findMany({
    where: { id: { in: cart.lines.map((l) => l.productId) } },
    select: { id: true, shippingCost: true, freeShipping: true, deliveryDaysMin: true, deliveryDaysMax: true },
  });
  const productMap = Object.fromEntries(productRows.map((p) => [p.id, p]));
  const totals = computeTotals({
    lines: cart.lines.map((l) => ({ key: l.id, sellerId: l.seller.id, unitPrice: l.unitPrice, quantity: l.quantity, ...productMap[l.productId] })),
    sellers: sellerMap,
    coupon: couponRecord && "coupon" in couponRecord ? couponRecord.coupon : null,
    deliveryMethod: input.deliveryMethod,
    countryCode: country,
  });

  // ── Risk ───────────────────────────────────────────────────────────────────
  const account = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { createdAt: true } });
  const risk = await assessOrder({
    userId: user.id,
    total: totals.total,
    itemCount: cart.itemCount,
    accountAgeMs: Date.now() - account.createdAt.getTime(),
    emailVerified: user.emailVerified,
    shippingCountry: country,
  });

  const now = new Date();
  const maxDays = Math.max(...totals.groups.map((g) => g.deliveryDaysMax));
  const eta = deliveryWindow(now, 0, maxDays).latest;
  const number = generateOrderNumber(now);

  // ── Transaction: stock + order ─────────────────────────────────────────────
  const order = await db.$transaction(async (tx) => {
    for (const line of cart.lines) {
      // Conditional decrement: fails instead of overselling under concurrency.
      const res = await tx.inventory.updateMany({
        where: { variantId: line.variantId, quantity: { gte: line.quantity } },
        data: { quantity: { decrement: line.quantity } },
      });
      if (!res.count) throw new AppError("OUT_OF_STOCK", "errors.OUT_OF_STOCK");
      await tx.product.update({
        where: { id: line.productId },
        data: { totalStock: { decrement: line.quantity }, salesCount: { increment: line.quantity } },
      });
    }

    const created = await tx.order.create({
      data: {
        number,
        userId: user.id,
        email: input.contact.email,
        shippingAddress: { ...address, contactName: input.contact.fullName, contactPhone: input.contact.phone ?? null },
        deliveryMethod: input.deliveryMethod,
        subtotal: totals.subtotal,
        discountTotal: totals.discount + totals.shippingDiscount,
        shippingTotal: totals.shipping - totals.shippingDiscount,
        taxTotal: totals.tax,
        total: totals.total,
        presentmentCurrency: meta.currency,
        exchangeRate: meta.exchangeRate,
        couponId,
        estimatedDeliveryAt: eta,
        riskScore: risk.score,
        events: { create: { status: "PENDING_PAYMENT", actorId: user.id } },
      },
    });

    for (const group of totals.groups) {
      const shipment = await tx.shipment.create({
        data: { orderId: created.id, sellerId: group.sellerId, estimatedDeliveryAt: deliveryWindow(now, 0, group.deliveryDaysMax).latest },
      });
      const lines = cart.lines.filter((l) => l.seller.id === group.sellerId);
      await tx.orderItem.createMany({
        data: lines.map((l) => {
          const discount = totals.lineDiscounts[l.id] ?? 0;
          return {
            orderId: created.id,
            shipmentId: shipment.id,
            productId: l.productId,
            variantId: l.variantId,
            sellerId: l.seller.id,
            title: l.title,
            variantName: l.variantName,
            imageUrl: l.image?.url ?? null,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            discount,
            lineTotal: l.lineTotal,
            commission: applyBps(l.lineTotal - discount, sellerMap[l.seller.id]?.commissionBps ?? 1000),
          };
        }),
      });
    }

    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      await tx.couponRedemption.create({ data: { couponId, userId: user.id, orderId: created.id } });
    }

    await tx.payment.create({
      data: {
        orderId: created.id,
        provider: payments().name,
        method: input.paymentMethod,
        amount: totals.total,
        currency: "EUR",
        idempotencyKey: input.idempotencyKey,
      },
    });
    return created;
  });

  // ── Payment (outside the DB transaction) ──────────────────────────────────
  const result = await payments().createPayment({
    amount: totals.total,
    currency: "EUR",
    method: input.paymentMethod,
    paymentToken: input.paymentToken,
    orderNumber: number,
    customerEmail: input.contact.email,
    idempotencyKey: input.idempotencyKey,
  });

  if (result.status === "FAILED") {
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { idempotencyKey: input.idempotencyKey }, data: { status: "FAILED", failureCode: result.failureCode, providerPaymentId: result.providerPaymentId } });
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await tx.orderItem.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
      await tx.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: `payment_failed:${result.failureCode}` } });
      await restock(tx, cart.lines);
      if (couponId) {
        await tx.couponRedemption.deleteMany({ where: { orderId: order.id } });
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { decrement: 1 } } });
      }
    });
    await recordPaymentFailure(user.id, order.id);
    throw new AppError("PAYMENT_FAILED", "errors.PAYMENT_DECLINED");
  }

  const paymentStatus = result.status === "CAPTURED" ? "CAPTURED" : result.status === "AUTHORIZED" ? "AUTHORIZED" : result.status === "REQUIRES_ACTION" ? "REQUIRES_ACTION" : "PENDING";
  await db.payment.update({ where: { idempotencyKey: input.idempotencyKey }, data: { status: paymentStatus, providerPaymentId: result.providerPaymentId } });

  const paid = paymentStatus === "CAPTURED" || paymentStatus === "AUTHORIZED";
  if (paid) {
    await db.order.update({ where: { id: order.id }, data: { status: "PAYMENT_CONFIRMED" } });
    await db.orderEvent.create({ data: { orderId: order.id, status: "PAYMENT_CONFIRMED" } });
  }

  // Cart cleanup: purchased lines leave, saved-for-later stays.
  await db.cartItem.deleteMany({ where: { cartId: cartRow.id, savedForLater: false } });
  await db.cart.update({ where: { id: cartRow.id }, data: { couponCode: null } });

  // ── Side effects ───────────────────────────────────────────────────────────
  const href = `/account/orders/${number}`;
  await notify(user.id, { type: "ORDER_CONFIRMATION", key: "orderPlaced", vars: { number }, href });
  if (paid) await notify(user.id, { type: "PAYMENT_CONFIRMATION", key: "paymentConfirmed", vars: { number }, href });
  for (const s of sellerRows) await notify(s.userId, { type: "SELLER_UPDATE", key: "newOrder", vars: { number }, href: "/seller/orders" });
  for (const l of cart.lines) await trackEvent({ userId: user.id, type: "PURCHASE", productId: l.productId });
  if (couponId) await assessCouponUse(user.id, couponId);
  if (risk.score >= REVIEW_THRESHOLD) {
    await flag({ type: "ABNORMAL_ORDER", score: risk.score, userId: user.id, orderId: order.id, details: { reasons: risk.reasons } });
  }
  await audit("order.placed", { type: "Order", id: order.id }, { actorId: user.id, ipHash: meta.ipHash, metadata: { total: totals.total, riskScore: risk.score } });

  if (result.status === "REQUIRES_ACTION") return { status: "requires_action", orderNumber: number, redirectUrl: result.redirectUrl };
  return {
    status: paid ? "confirmed" : "pending_payment",
    orderNumber: number,
    bankTransfer: result.status === "PENDING" ? result.instructions : undefined,
  };
}
