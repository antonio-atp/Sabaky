import { z } from "zod";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { addToWishlist, removeFromWishlist } from "@/server/services/wishlist";

/** `id` is the product id. */
export const DELETE = api({ auth: "user", rateLimit: RATE_LIMITS.write }, async ({ user, params }) => {
  await removeFromWishlist(user.id, params.id);
  return { ok: true };
});

export const PATCH = api({ auth: "user", body: z.object({ notifyOnPriceDrop: z.boolean() }), rateLimit: RATE_LIMITS.write }, async ({ user, params, body }) => {
  await addToWishlist(user.id, params.id, body.notifyOnPriceDrop);
  return { ok: true };
});
