import "server-only";
import { randomToken } from "../../security/crypto";
import type { PaymentProvider } from "./types";

/**
 * Test-mode provider: no money moves. Behaviour is driven by the client-side
 * test token so every checkout branch can be exercised:
 *   tok_test_success (default) → captured
 *   tok_test_declined          → card declined
 *   tok_test_3ds               → requires customer action
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(input: Parameters<PaymentProvider["createPayment"]>[0]) {
    const providerPaymentId = `mock_pi_${randomToken(12)}`;
    if (input.method === "BANK_TRANSFER") {
      return {
        status: "PENDING" as const,
        providerPaymentId,
        instructions: {
          iban: "PT50 0000 0000 0000 0000 0000 0",
          bic: "SBKYPTPL",
          beneficiary: "Sabaky Marketplace (test)",
          reference: input.orderNumber,
        },
      };
    }
    if (input.paymentToken === "tok_test_declined") {
      return { status: "FAILED" as const, providerPaymentId, failureCode: "card_declined" };
    }
    return { status: "CAPTURED" as const, providerPaymentId };
  }

  async refund() {
    return { status: "COMPLETED" as const, providerRefundId: `mock_re_${randomToken(12)}` };
  }

  async parseWebhook() {
    return null;
  }
}
