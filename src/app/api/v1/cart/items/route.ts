import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { addToCartSchema } from "@/shared/validation";
import { addItem, cartCount } from "@/server/services/cart";
import { cartOwner } from "@/server/context";
import { setGuestCartCookie } from "@/server/http/session-response";
import { trackEvent } from "@/server/services/recommendations";
import { db } from "@/server/db";

export const POST = api({ body: addToCartSchema, rateLimit: RATE_LIMITS.write }, async ({ body, user }) => {
  const owner = await cartOwner();
  const result = await addItem(owner, body.variantId, body.quantity);
  if (result.newGuestToken) {
    await setGuestCartCookie(result.newGuestToken);
    owner.guestToken = result.newGuestToken;
  }
  if (user) {
    const variant = await db.productVariant.findUnique({ where: { id: body.variantId }, select: { productId: true } });
    if (variant) await trackEvent({ userId: user.id, type: "ADD_TO_CART", productId: variant.productId });
  }
  return { count: await cartCount(owner), limited: result.limited };
});
