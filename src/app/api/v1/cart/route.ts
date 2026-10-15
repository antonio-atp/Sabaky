import { z } from "zod";
import { api } from "@/server/http/api";
import { getCart } from "@/server/services/cart";
import { cartOwner } from "@/server/context";
import { getPreferences } from "@/i18n/server";
import { DELIVERY_METHODS } from "@/shared/constants";

export const GET = api({ query: z.object({ deliveryMethod: z.enum(DELIVERY_METHODS).optional() }) }, async ({ query }) => {
  const { country } = await getPreferences();
  return getCart(await cartOwner(), { country, deliveryMethod: query.deliveryMethod });
});
