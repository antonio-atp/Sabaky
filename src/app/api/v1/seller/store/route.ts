import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { storeSettingsSchema } from "@/shared/validation";
import { updateStoreSettings } from "@/server/services/seller";
import { requireSeller } from "@/server/http/seller-guard";

export const PATCH = api({ auth: ["SELLER"], body: storeSettingsSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body }) => {
  const seller = await requireSeller(user, { write: true });
  await updateStoreSettings(seller.id, user.id, body);
  return { ok: true };
});
