import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { reviewModerationSchema } from "@/shared/validation";
import { moderateReview } from "@/server/services/admin";

export const POST = api({ auth: ["ADMIN"], body: reviewModerationSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  await moderateReview(user.id, params.id, body.action, ipHash);
  return { ok: true };
});
