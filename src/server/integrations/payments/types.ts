import type { PaymentMethodCode } from "@/shared/constants";

/**
 * Payment provider port. Card data never touches Sabaky servers: the client
 * collects it through the provider's hosted fields / wallet sheet, which
 * returns an opaque `paymentToken`. We only persist provider IDs.
 */
export interface CreatePaymentInput {
  amount: number; // minor units
  currency: string;
  method: PaymentMethodCode;
  paymentToken?: string;
  orderNumber: string;
  customerEmail: string;
  idempotencyKey: string;
}

export type PaymentResult =
  | { status: "CAPTURED" | "AUTHORIZED"; providerPaymentId: string }
  | { status: "PENDING"; providerPaymentId: string; instructions?: BankTransferInstructions }
  | { status: "REQUIRES_ACTION"; providerPaymentId: string; redirectUrl: string }
  | { status: "FAILED"; providerPaymentId?: string; failureCode: string };

export interface BankTransferInstructions {
  iban: string;
  bic: string;
  beneficiary: string;
  reference: string;
}

export interface RefundResult {
  status: "COMPLETED" | "PROCESSING" | "FAILED";
  providerRefundId?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  refund(providerPaymentId: string, amount: number, idempotencyKey: string): Promise<RefundResult>;
  /** Verify + parse an incoming webhook. Must check the provider signature. */
  parseWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent | null>;
}

export type WebhookEvent =
  | { type: "payment.succeeded"; providerPaymentId: string }
  | { type: "payment.failed"; providerPaymentId: string; failureCode: string }
  | { type: "refund.completed"; providerRefundId: string };
