import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { returnRequestSchema } from "@/shared/validation";
import { requestReturn } from "@/server/services/orders";

export const POST = api({ auth: "user", body: returnRequestSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  const ret = await requestReturn(user.id, params.number, body, ipHash);
  return { id: ret.id };
});
