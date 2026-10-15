import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { updateCartItemSchema } from "@/shared/validation";
import { getCart, removeItem, updateItem } from "@/server/services/cart";
import { cartOwner } from "@/server/context";
import { getPreferences } from "@/i18n/server";

export const PATCH = api({ body: updateCartItemSchema, rateLimit: RATE_LIMITS.write }, async ({ body, params }) => {
  const owner = await cartOwner();
  await updateItem(owner, params.id, body);
  return getCart(owner, { country: (await getPreferences()).country });
});

export const DELETE = api({ rateLimit: RATE_LIMITS.write }, async ({ params }) => {
  const owner = await cartOwner();
  await removeItem(owner, params.id);
  return getCart(owner, { country: (await getPreferences()).country });
});
