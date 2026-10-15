import { api } from "@/server/http/api";
import { checkoutQuoteSchema } from "@/shared/validation";
import { getCart } from "@/server/services/cart";

/** Server-authoritative totals for the chosen destination + a price for every delivery method. */
export const POST = api({ auth: "user", body: checkoutQuoteSchema }, async ({ user, body }) => {
  const { deliveryOptions = [], ...cart } = await getCart({ userId: user.id, guestToken: null }, { country: body.countryCode, deliveryMethod: body.deliveryMethod });
  return { cart, deliveryOptions };
});
