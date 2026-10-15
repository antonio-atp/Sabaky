import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "../../security/crypto";
import type { CreatePaymentInput, PaymentProvider, PaymentResult, RefundResult, WebhookEvent } from "./types";

/**
 * Stripe adapter using the REST API directly (no SDK dependency).
 * Requires STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET. The browser uses Stripe
 * Elements with NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to produce a PaymentMethod
 * id (`pm_…`), which is passed here as `paymentToken`.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {}

  private async call<T>(path: string, params: Record<string, string>, idempotencyKey: string): Promise<T> {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as T & { error?: { code?: string } };
    if (!res.ok) throw Object.assign(new Error("stripe_error"), { code: json.error?.code ?? "provider_error" });
    return json;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const types: Record<string, string> = {
      CARD: "card",
      APPLE_PAY: "card",
      GOOGLE_PAY: "card",
      PAYPAL: "paypal",
      BANK_TRANSFER: "customer_balance",
    };
    try {
      const intent = await this.call<{ id: string; status: string; next_action?: { redirect_to_url?: { url: string } } }>(
        "payment_intents",
        {
          amount: String(input.amount),
          currency: input.currency.toLowerCase(),
          "payment_method_types[]": types[input.method] ?? "card",
          ...(input.paymentToken ? { payment_method: input.paymentToken, confirm: "true" } : {}),
          receipt_email: input.customerEmail,
          "metadata[order_number]": input.orderNumber,
        },
        input.idempotencyKey,
      );
      if (intent.status === "succeeded") return { status: "CAPTURED", providerPaymentId: intent.id };
      if (intent.status === "requires_capture") return { status: "AUTHORIZED", providerPaymentId: intent.id };
      if (intent.status === "requires_action" && intent.next_action?.redirect_to_url) {
        return { status: "REQUIRES_ACTION", providerPaymentId: intent.id, redirectUrl: intent.next_action.redirect_to_url.url };
      }
      return { status: "PENDING", providerPaymentId: intent.id };
    } catch (e) {
      return { status: "FAILED", failureCode: (e as { code?: string }).code ?? "provider_error" };
    }
  }

  async refund(providerPaymentId: string, amount: number, idempotencyKey: string): Promise<RefundResult> {
    try {
      const refund = await this.call<{ id: string; status: string }>(
        "refunds",
        { payment_intent: providerPaymentId, amount: String(amount) },
        idempotencyKey,
      );
      return { status: refund.status === "succeeded" ? "COMPLETED" : "PROCESSING", providerRefundId: refund.id };
    } catch {
      return { status: "FAILED" };
    }
  }

  /** Stripe-Signature: t=timestamp,v1=hmac — verified with a 5 min tolerance. */
  async parseWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent | null> {
    if (!signature || !this.webhookSecret) return null;
    const parts = Object.fromEntries(signature.split(",").map((kv) => kv.split("=") as [string, string]));
    const timestamp = Number(parts.t);
    if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return null;
    const expected = createHmac("sha256", this.webhookSecret).update(`${parts.t}.${rawBody}`).digest("hex");
    if (!parts.v1 || !safeEqual(expected, parts.v1)) return null;

    const event = JSON.parse(rawBody) as { type: string; data: { object: { id: string; last_payment_error?: { code?: string } } } };
    const obj = event.data.object;
    switch (event.type) {
      case "payment_intent.succeeded":
        return { type: "payment.succeeded", providerPaymentId: obj.id };
      case "payment_intent.payment_failed":
        return { type: "payment.failed", providerPaymentId: obj.id, failureCode: obj.last_payment_error?.code ?? "failed" };
      case "refund.updated":
        return { type: "refund.completed", providerRefundId: obj.id };
      default:
        return null;
    }
  }
}
