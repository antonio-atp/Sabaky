import "server-only";
import { randomInt } from "node:crypto";
import { db, type Tx } from "../db";
import { AppError } from "../http/errors";
import { payments } from "../integrations/payments";
import { audit } from "./audit";
import { notify } from "./notifications";
import { assessRefundRequest } from "./risk";
import { CANCELLABLE_STATUSES, RETURN_WINDOW_DAYS } from "@/shared/constants";
import type { OrderStatus, ShipmentStatus } from "@/generated/prisma/client";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L ambiguity

export function generateOrderNumber(now = new Date()) {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `SBK-${date}-${suffix}`;
}

export async function restock(tx: Tx, items: { variantId: string; productId: string; quantity: number }[]) {
  for (const item of items) {
    await tx.inventory.update({ where: { variantId: item.variantId }, data: { quantity: { increment: item.quantity } } });
    await tx.product.update({
      where: { id: item.productId },
      data: { totalStock: { increment: item.quantity }, salesCount: { decrement: item.quantity } },
    });
  }
}

// ── Customer read models ────────────────────────────────────────────────────

export async function listOrders(userId: string, page = 1, pageSize = 10) {
  const [items, total] = await Promise.all([
    db.order.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        placedAt: true,
        estimatedDeliveryAt: true,
        items: { select: { id: true, title: true, imageUrl: true, quantity: true }, take: 4 },
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where: { userId } }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getOrderForUser(userId: string, number: string) {
  const order = await db.order.findFirst({
    where: { number, userId }, // ownership enforced in the query (IDOR-safe)
    include: {
      items: { include: { product: { select: { slug: true } }, seller: { select: { storeName: true, slug: true } }, review: { select: { id: true } } } },
      shipments: { include: { events: { orderBy: { occurredAt: "desc" } }, seller: { select: { storeName: true } } } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { select: { method: true, status: true, amount: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      refunds: { orderBy: { createdAt: "desc" } },
      returns: { select: { id: true, orderItemId: true, status: true, quantity: true, reason: true, createdAt: true } },
    },
  });
  if (!order) return null;
  const deliveredAt = order.shipments.map((s) => s.deliveredAt).filter(Boolean).sort().at(-1) ?? null;
  const returnDeadline = deliveredAt ? new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 86_400_000) : null;
  return {
    ...order,
    canCancel: (CANCELLABLE_STATUSES as readonly string[]).includes(order.status),
    canReturn: !!returnDeadline && returnDeadline > new Date() && order.status === "DELIVERED",
    returnDeadline,
  };
}

// ── Customer actions ────────────────────────────────────────────────────────

export async function cancelOrder(userId: string, number: string, reason: string | null, ipHash: string) {
  const order = await db.order.findFirst({ where: { number, userId }, include: { items: true, payments: true } });
  if (!order) throw new AppError("NOT_FOUND");
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(order.status)) throw new AppError("CONFLICT", "errors.ORDER_NOT_CANCELLABLE");

  const captured = order.payments.find((p) => p.status === "CAPTURED" || p.status === "AUTHORIZED");
  await db.$transaction(async (tx) => {
    // Optimistic concurrency: only cancel if the status did not change meanwhile (e.g. seller shipped).
    const updated = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    if (!updated.count) throw new AppError("CONFLICT", "errors.ORDER_NOT_CANCELLABLE");
    await tx.orderItem.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
    await tx.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: reason, actorId: userId } });
    await restock(tx, order.items);
    if (captured) {
      await tx.refund.create({ data: { orderId: order.id, paymentId: captured.id, amount: captured.amount, reason: "order_cancelled", status: "PROCESSING" } });
    }
    await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  });

  if (captured?.providerPaymentId) {
    const result = await payments().refund(captured.providerPaymentId, captured.amount, `cancel-${order.id}`);
    await db.refund.updateMany({
      where: { orderId: order.id, reason: "order_cancelled", status: "PROCESSING" },
      data: { status: result.status === "COMPLETED" ? "COMPLETED" : result.status === "FAILED" ? "FAILED" : "PROCESSING", providerRefundId: result.providerRefundId },
    });
    if (result.status === "COMPLETED") {
      await db.payment.update({ where: { id: captured.id }, data: { status: "REFUNDED" } });
      await db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    }
  }

  await notify(userId, { type: "REFUND_UPDATE", key: "orderCancelled", vars: { number }, href: `/account/orders/${number}` });
  await audit("order.cancelled", { type: "Order", id: order.id }, { actorId: userId, ipHash, metadata: { reason } });
}

export async function requestReturn(
  userId: string,
  number: string,
  input: { orderItemId: string; quantity: number; reason: string; details: string | null },
  ipHash: string,
) {
  const order = await getOrderForUser(userId, number);
  if (!order) throw new AppError("NOT_FOUND");
  if (!order.canReturn) throw new AppError("CONFLICT", "errors.RETURN_NOT_ELIGIBLE");
  const item = order.items.find((i) => i.id === input.orderItemId);
  if (!item || item.status !== "ACTIVE") throw new AppError("CONFLICT", "errors.RETURN_NOT_ELIGIBLE");
  const alreadyRequested = order.returns.filter((r) => r.orderItemId === item.id && r.status !== "REJECTED").reduce((s, r) => s + r.quantity, 0);
  if (input.quantity + alreadyRequested > item.quantity) throw new AppError("BAD_REQUEST", "errors.RETURN_QUANTITY");

  const perUnit = Math.round((item.lineTotal - item.discount) / item.quantity);
  const ret = await db.$transaction(async (tx) => {
    const r = await tx.returnRequest.create({
      data: { orderId: order.id, orderItemId: item.id, userId, reason: input.reason, details: input.details, quantity: input.quantity },
    });
    await tx.refund.create({ data: { orderId: order.id, returnId: r.id, amount: perUnit * input.quantity, reason: `return:${input.reason}` } });
    await tx.orderItem.update({ where: { id: item.id }, data: { status: "RETURN_REQUESTED" } });
    return r;
  });

  const seller = await db.seller.findUnique({ where: { id: item.sellerId }, select: { userId: true } });
  if (seller) await notify(seller.userId, { type: "SELLER_UPDATE", key: "returnRequested", vars: { number }, href: "/seller/orders" });
  await notify(userId, { type: "REFUND_UPDATE", key: "returnReceived", vars: { number }, href: `/account/orders/${number}` });
  await assessRefundRequest(userId, order.id);
  await audit("order.return_requested", { type: "ReturnRequest", id: ret.id }, { actorId: userId, ipHash });
  return ret;
}

// ── Status propagation ──────────────────────────────────────────────────────

const SHIPMENT_TO_ORDER: Partial<Record<ShipmentStatus, OrderStatus>> = {
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};
const RANK: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

/**
 * A multi-seller order advances to the *least advanced* shipment status, so
 * "Delivered" means every parcel arrived.
 */
export async function syncOrderStatus(orderId: string, actorId: string | null) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { shipments: true } });
  if (["CANCELLED", "REFUNDED", "PENDING_PAYMENT"].includes(order.status)) return order.status;

  const statuses = order.shipments.map((s) => SHIPMENT_TO_ORDER[s.status] ?? "PROCESSING");
  const next = statuses.reduce<OrderStatus>((min, s) => (RANK.indexOf(s) < RANK.indexOf(min) ? s : min), "DELIVERED");
  if (RANK.indexOf(next) > RANK.indexOf(order.status)) {
    await db.order.update({ where: { id: orderId }, data: { status: next } });
    await db.orderEvent.create({ data: { orderId, status: next, actorId } });
    const key = next === "DELIVERED" ? "delivered" : next === "OUT_FOR_DELIVERY" ? "outForDelivery" : "shipped";
    await notify(order.userId, {
      type: next === "DELIVERED" ? "DELIVERY_UPDATE" : "SHIPPING_UPDATE",
      key,
      vars: { number: order.number },
      href: `/account/orders/${order.number}`,
    });
  }
  return next;
}
