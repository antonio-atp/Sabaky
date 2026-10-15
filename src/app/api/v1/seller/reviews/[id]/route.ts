import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { reviewReplySchema } from "@/shared/validation";
import { replyToReview } from "@/server/services/seller";
import { requireSeller } from "@/server/http/seller-guard";

export const POST = api({ auth: ["SELLER"], body: reviewReplySchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body }) => {
  const seller = await requireSeller(user, { write: true });
  await replyToReview(seller.id, user.id, params.id, body.reply);
  return { ok: true };
});
