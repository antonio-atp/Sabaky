import { NextResponse, type NextRequest } from "next/server";
import { payments } from "@/server/integrations/payments";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { notify } from "@/server/services/notifications";

/**
 * Payment provider webhooks. Authenticated by the provider signature (not by
 * cookies/CSRF). Handlers are idempotent: replays are harmless.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const event = await payments().parseWebhook(raw, req.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "invalid_signature" }, { status: 400 });

  try {
    if (event.type === "payment.succeeded") {
      const payment = await db.payment.findFirst({ where: { providerPaymentId: event.providerPaymentId }, include: { order: true } });
      if (payment && payment.status !== "CAPTURED") {
        await db.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED" } });
        if (payment.order.status === "PENDING_PAYMENT") {
          await db.order.update({ where: { id: payment.orderId }, data: { status: "PAYMENT_CONFIRMED" } });
          await db.orderEvent.create({ data: { orderId: payment.orderId, status: "PAYMENT_CONFIRMED", note: "webhook" } });
          await notify(payment.order.userId, { type: "PAYMENT_CONFIRMATION", key: "paymentConfirmed", vars: { number: payment.order.number }, href: `/account/orders/${payment.order.number}` });
        }
      }
    } else if (event.type === "payment.failed") {
      await db.payment.updateMany({ where: { providerPaymentId: event.providerPaymentId, status: { not: "CAPTURED" } }, data: { status: "FAILED", failureCode: event.failureCode } });
    } else if (event.type === "refund.completed") {
      await db.refund.updateMany({ where: { providerRefundId: event.providerRefundId }, data: { status: "COMPLETED" } });
    }
  } catch (error) {
    logger.error("Webhook processing failed", { type: event.type, error });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 }); // provider retries
  }
  return NextResponse.json({ received: true });
}
