import { z } from "zod";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { reviewSchema } from "@/shared/validation";
import { getProductReviews } from "@/server/services/catalog";
import { createReview } from "@/server/services/reviews";

export const GET = api({ query: z.object({ page: z.coerce.number().int().min(1).max(200).default(1) }) }, async ({ params, query }) =>
  getProductReviews(params.id, query.page),
);

export const POST = api({ auth: "user", body: reviewSchema, rateLimit: RATE_LIMITS.review }, async ({ params, body, user }) => {
  const review = await createReview(user.id, params.id, body);
  return { id: review.id };
});
