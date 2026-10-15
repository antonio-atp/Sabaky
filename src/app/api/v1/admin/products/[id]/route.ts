import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { productModerationSchema } from "@/shared/validation";
import { moderateProduct } from "@/server/services/admin";

export const POST = api({ auth: ["ADMIN"], body: productModerationSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  await moderateProduct(user.id, params.id, body.action, body.note, ipHash);
  return { ok: true };
});
