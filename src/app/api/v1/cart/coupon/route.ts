import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { couponSchema } from "@/shared/validation";
import { getCart, setCoupon } from "@/server/services/cart";
import { cartOwner } from "@/server/context";
import { setGuestCartCookie } from "@/server/http/session-response";
import { getPreferences } from "@/i18n/server";

// Tight limit: coupon endpoints are a classic brute-force / enumeration target.
const couponLimit = { name: "coupon", limit: 10, windowMs: 10 * 60_000 };

export const POST = api({ body: couponSchema, rateLimit: couponLimit }, async ({ body }) => {
  const owner = await cartOwner();
  const { newGuestToken } = await setCoupon(owner, body.code);
  if (newGuestToken) {
    await setGuestCartCookie(newGuestToken);
    owner.guestToken = newGuestToken;
  }
  return getCart(owner, { country: (await getPreferences()).country });
});

export const DELETE = api({ rateLimit: RATE_LIMITS.write }, async () => {
  const owner = await cartOwner();
  await setCoupon(owner, null);
  return getCart(owner, { country: (await getPreferences()).country });
});
