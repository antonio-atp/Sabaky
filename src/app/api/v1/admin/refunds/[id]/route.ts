import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { refundDecisionSchema } from "@/shared/validation";
import { decideRefund } from "@/server/services/admin";

export const POST = api({ auth: ["ADMIN"], body: refundDecisionSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  await decideRefund(user.id, params.id, body.decision, ipHash);
  return { ok: true };
});
