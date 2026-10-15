import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { cancelOrderSchema } from "@/shared/validation";
import { cancelOrder } from "@/server/services/orders";

export const POST = api({ auth: "user", body: cancelOrderSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  await cancelOrder(user.id, params.number, body.reason, ipHash);
  return { ok: true };
});
