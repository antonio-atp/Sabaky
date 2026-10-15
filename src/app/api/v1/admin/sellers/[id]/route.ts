import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { sellerDecisionSchema } from "@/shared/validation";
import { decideSeller } from "@/server/services/admin";

export const POST = api({ auth: ["ADMIN"], body: sellerDecisionSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  await decideSeller(user.id, params.id, body.decision, body.notes, ipHash);
  return { ok: true };
});
