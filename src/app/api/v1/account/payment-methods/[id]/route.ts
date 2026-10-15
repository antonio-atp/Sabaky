import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { deletePaymentMethod } from "@/server/services/account";
import { audit } from "@/server/services/audit";

export const DELETE = api({ auth: "user", rateLimit: RATE_LIMITS.write }, async ({ user, params, ipHash }) => {
  await deletePaymentMethod(user.id, params.id);
  await audit("account.payment_method_removed", { type: "PaymentMethod", id: params.id }, { actorId: user.id, ipHash });
  return { ok: true };
});
