import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { wishlistSchema } from "@/shared/validation";
import { addToWishlist, getWishlist } from "@/server/services/wishlist";

export const GET = api({ auth: "user" }, async ({ user }) => getWishlist(user.id));

export const POST = api({ auth: "user", body: wishlistSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body }) => {
  await addToWishlist(user.id, body.productId, body.notifyOnPriceDrop ?? true);
  return { ok: true };
});
