import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { sellerRegisterSchema } from "@/shared/validation";
import { registerSeller } from "@/server/services/seller";

export const POST = api({ auth: "user", body: sellerRegisterSchema, rateLimit: RATE_LIMITS.register }, async ({ user, body, ipHash }) => {
  const seller = await registerSeller(user.id, user.emailVerified, body, ipHash);
  return { id: seller.id, slug: seller.slug, status: seller.status };
});
