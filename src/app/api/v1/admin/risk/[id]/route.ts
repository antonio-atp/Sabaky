import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { riskDecisionSchema } from "@/shared/validation";
import { decideRisk } from "@/server/services/admin";

export const POST = api({ auth: ["ADMIN"], body: riskDecisionSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  await decideRisk(user.id, params.id, body.status, ipHash);
  return { ok: true };
});
