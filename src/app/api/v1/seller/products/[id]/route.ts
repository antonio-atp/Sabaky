import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { productInputSchema } from "@/shared/validation";
import { archiveProduct, getSellerProduct, saveProduct } from "@/server/services/seller";
import { requireSeller } from "@/server/http/seller-guard";

export const GET = api({ auth: ["SELLER"] }, async ({ user, params }) => {
  const seller = await requireSeller(user);
  return getSellerProduct(seller.id, params.id);
});

export const PATCH = api({ auth: ["SELLER"], body: productInputSchema, rateLimit: RATE_LIMITS.write, maxBodyBytes: 256_000 }, async ({ user, params, body }) => {
  const seller = await requireSeller(user, { write: true });
  const product = await saveProduct(seller.id, user.id, body, params.id);
  return { id: product.id, slug: product.slug, status: product.status };
});

export const DELETE = api({ auth: ["SELLER"], rateLimit: RATE_LIMITS.write }, async ({ user, params }) => {
  const seller = await requireSeller(user, { write: true });
  await archiveProduct(seller.id, user.id, params.id);
  return { ok: true };
});
