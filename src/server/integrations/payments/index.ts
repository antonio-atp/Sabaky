import "server-only";
import { env } from "../../env";
import { MockPaymentProvider } from "./mock";
import { StripePaymentProvider } from "./stripe";
import type { PaymentProvider } from "./types";

let provider: PaymentProvider | undefined;

export function payments(): PaymentProvider {
  if (provider) return provider;
  const e = env();
  provider =
    e.PAYMENT_PROVIDER === "stripe"
      ? new StripePaymentProvider(e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET)
      : new MockPaymentProvider();
  return provider;
}

export type * from "./types";
