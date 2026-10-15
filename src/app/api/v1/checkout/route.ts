import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { checkoutSchema } from "@/shared/validation";
import { placeOrder } from "@/server/services/checkout";
import { getPreferences } from "@/i18n/server";
import { CURRENCIES } from "@/shared/config/currencies";

export const POST = api({ auth: "user", body: checkoutSchema, rateLimit: RATE_LIMITS.checkout }, async ({ user, body, ipHash }) => {
  const { currency } = await getPreferences();
  return placeOrder(user, body, { ipHash, currency, exchangeRate: CURRENCIES[currency].rate });
});
