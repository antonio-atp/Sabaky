import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { addressSchema } from "@/shared/validation";
import { deleteAddress, updateAddress } from "@/server/services/account";

export const PATCH = api({ auth: "user", body: addressSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body }) => updateAddress(user.id, params.id, body));

export const DELETE = api({ auth: "user", rateLimit: RATE_LIMITS.write }, async ({ user, params }) => {
  await deleteAddress(user.id, params.id);
  return { ok: true };
});
