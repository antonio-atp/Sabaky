import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { cardSelect, toCard, visibleProduct } from "./catalog";
import { notify } from "./notifications";
import { trackEvent } from "./recommendations";
import { defineJob } from "../jobs/queue";

async function wishlistId(userId: string) {
  const w = await db.wishlist.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
  return w.id;
}

export async function getWishlist(userId: string) {
  const id = await wishlistId(userId);
  const items = await db.wishlistItem.findMany({
    where: { wishlistId: id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          ...cardSelect(),
          status: true,
          deletedAt: true,
          variants: { where: { isActive: true }, orderBy: { price: "asc" }, take: 1, select: { id: true } },
        },
      },
    },
  });
  return items.map((i) => {
    const card = toCard(i.product);
    return {
      id: i.id,
      addedAt: i.createdAt,
      priceAtAdd: i.priceAtAdd,
      notifyOnPriceDrop: i.notifyOnPriceDrop,
      priceChange: card.price - i.priceAtAdd,
      available: i.product.status === "ACTIVE" && !i.product.deletedAt,
      defaultVariantId: i.product.variants[0]?.id ?? null,
      product: card,
    };
  });
}

export async function wishlistProductIds(userId: string) {
  const rows = await db.wishlistItem.findMany({ where: { wishlist: { userId } }, select: { productId: true } });
  return rows.map((r) => r.productId);
}

export async function addToWishlist(userId: string, productId: string, notifyOnPriceDrop = true) {
  const product = await db.product.findFirst({ where: { id: productId, ...visibleProduct() }, select: { ...cardSelect() } });
  if (!product) throw new AppError("NOT_FOUND");
  const id = await wishlistId(userId);
  await db.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: id, productId } },
    update: { notifyOnPriceDrop },
    create: { wishlistId: id, productId, priceAtAdd: toCard(product).price, notifyOnPriceDrop },
  });
  await trackEvent({ userId, type: "WISHLIST", productId });
}

export async function removeFromWishlist(userId: string, productId: string) {
  await db.wishlistItem.deleteMany({ where: { productId, wishlist: { userId } } });
}

/**
 * Price-drop fan-out, enqueued whenever a seller lowers a price. Runs as a
 * background job so seller edits stay fast even for products on 100k lists.
 */
export const priceDropJob = defineJob<{ productId: string; newPrice: number; title: string }>("wishlist.priceDrop", async ({ productId, newPrice, title }) => {
  const watchers = await db.wishlistItem.findMany({
    where: { productId, notifyOnPriceDrop: true, priceAtAdd: { gt: newPrice } },
    select: { wishlist: { select: { userId: true } }, product: { select: { slug: true } } },
    take: 10_000,
  });
  for (const w of watchers) {
    await notify(w.wishlist.userId, { type: "PRICE_DROP", key: "priceDrop", vars: { title: title.slice(0, 60) }, href: `/p/${w.product.slug}` });
  }
});
