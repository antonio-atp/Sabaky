import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { questionSchema } from "@/shared/validation";
import { askQuestion } from "@/server/services/reviews";

export const POST = api({ auth: "user", body: questionSchema, rateLimit: RATE_LIMITS.review }, async ({ params, body, user }) => {
  await askQuestion(user.id, params.id, body.question);
  return { ok: true };
});
