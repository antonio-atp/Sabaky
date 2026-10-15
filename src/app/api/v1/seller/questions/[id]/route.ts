import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { answerSchema } from "@/shared/validation";
import { answerQuestion } from "@/server/services/reviews";
import { requireSeller } from "@/server/http/seller-guard";

export const POST = api({ auth: ["SELLER"], body: answerSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body }) => {
  const seller = await requireSeller(user, { write: true });
  await answerQuestion(seller.id, user.id, params.id, body.answer);
  return { ok: true };
});
