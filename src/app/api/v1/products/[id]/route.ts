import { api } from "@/server/http/api";
import { AppError } from "@/server/http/errors";
import { getProductBySlug } from "@/server/services/catalog";
import { db } from "@/server/db";

/** Product detail for API clients. Accepts the product slug or id. */
export const GET = api({}, async ({ params }) => {
  let product = await getProductBySlug(params.id);
  if (!product) {
    const byId = await db.product.findUnique({ where: { id: params.id }, select: { slug: true } });
    if (byId) product = await getProductBySlug(byId.slug);
  }
  if (!product) throw new AppError("NOT_FOUND");
  // Internal promotion rows are replaced by the public `deal` field.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { seller, promotions, ...rest } = product;
  return { ...rest, seller: { id: seller.id, storeName: seller.storeName, slug: seller.slug, ratingAvg: seller.ratingAvg, ratingCount: seller.ratingCount } };
});
