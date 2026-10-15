import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { userModerationSchema } from "@/shared/validation";
import { moderateUser } from "@/server/services/admin";

export const POST = api({ auth: ["ADMIN"], body: userModerationSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  await moderateUser(user.id, params.id, body.action, body.reason, ipHash);
  return { ok: true };
});
