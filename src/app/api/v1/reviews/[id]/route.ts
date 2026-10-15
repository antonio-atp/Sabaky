import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { reportSchema, reviewSchema } from "@/shared/validation";
import { reportReview, updateReview } from "@/server/services/reviews";

/** Edit own review (within the edit window). */
export const PATCH = api({ auth: "user", body: reviewSchema, rateLimit: RATE_LIMITS.review }, async ({ params, body, user }) => {
  await updateReview(user.id, params.id, body);
  return { ok: true };
});

/** Report someone else's review for moderation. */
export const POST = api({ auth: "user", body: reportSchema, rateLimit: RATE_LIMITS.review }, async ({ params, body, user }) => {
  await reportReview(user.id, params.id, body.reason);
  return { ok: true };
});
