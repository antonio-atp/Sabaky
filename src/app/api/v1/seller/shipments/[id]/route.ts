import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { shipmentUpdateSchema } from "@/shared/validation";
import { updateShipment } from "@/server/services/seller";
import { requireSeller } from "@/server/http/seller-guard";

export const PATCH = api({ auth: ["SELLER"], body: shipmentUpdateSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body }) => {
  const seller = await requireSeller(user, { write: true });
  await updateShipment(seller.id, user.id, params.id, body);
  return { ok: true };
});
