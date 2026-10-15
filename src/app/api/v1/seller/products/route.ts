import { z } from "zod";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { productInputSchema } from "@/shared/validation";
import { listSellerProducts, saveProduct } from "@/server/services/seller";
import { requireSeller } from "@/server/http/seller-guard";

const query = z.object({
  q: z.string().max(80).optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const GET = api({ auth: ["SELLER"], query }, async ({ user, query }) => {
  const seller = await requireSeller(user);
  return listSellerProducts(seller.id, query);
});

export const POST = api({ auth: ["SELLER"], body: productInputSchema, rateLimit: RATE_LIMITS.write, maxBodyBytes: 256_000 }, async ({ user, body }) => {
  const seller = await requireSeller(user, { write: true });
  const product = await saveProduct(seller.id, user.id, body);
  return { id: product.id, slug: product.slug, status: product.status };
});
