import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { inventoryUpdateSchema } from "@/shared/validation";
import { updateInventory } from "@/server/services/seller";
import { requireSeller } from "@/server/http/seller-guard";

export const PATCH = api({ auth: ["SELLER"], body: inventoryUpdateSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body }) => {
  const seller = await requireSeller(user, { write: true });
  await updateInventory(seller.id, params.variantId, body);
  return { ok: true };
});
