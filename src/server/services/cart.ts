import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { randomToken, sha256 } from "../security/crypto";
import { activePromotionWhere, effectivePrice } from "./catalog";
import { computeTotals, type PricingCoupon, type PricingLine, type PricingSeller } from "./pricing";
import { DELIVERY_METHODS, MAX_CART_LINE_QTY, type DeliveryMethodCode } from "@/shared/constants";
import type { CartDTO, CartLineDTO } from "@/shared/types";

/**
 * Carts are server-side for both guests (opaque cookie token, hashed at rest)
 * and customers, so they survive devices and are merged at login. Prices and
 * stock are always re-read from the database — the client only sends
 * variant IDs and quantities.
 */

export interface CartOwner {
  userId: string | null;
  guestToken: string | null;
}

export async function findCart(owner: CartOwner) {
  if (owner.userId) return db.cart.findUnique({ where: { userId: owner.userId } });
  if (owner.guestToken) return db.cart.findUnique({ where: { guestTokenHash: sha256(owner.guestToken) } });
  return null;
}

/** Returns the cart, creating it if needed. `newGuestToken` must be set as a cookie by the caller. */
export async function getOrCreateCart(owner: CartOwner) {
  const existing = await findCart(owner);
  if (existing) return { cart: existing, newGuestToken: null as string | null };
  if (owner.userId) {
    const cart = await db.cart.upsert({ where: { userId: owner.userId }, update: {}, create: { userId: owner.userId } });
    return { cart, newGuestToken: null };
  }
  const token = randomToken(24);
  const cart = await db.cart.create({ data: { guestTokenHash: sha256(token) } });
  return { cart, newGuestToken: token };
}

async function available(variantId: string) {
  const inv = await db.inventory.findUnique({ where: { variantId } });
  return Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved ?? 0));
}

async function assertPurchasable(variantId: string) {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { isActive: true, product: { select: { status: true, deletedAt: true, seller: { select: { status: true } } } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE" || variant.product.deletedAt || variant.product.seller.status !== "VERIFIED") {
    throw new AppError("NOT_FOUND", "errors.PRODUCT_UNAVAILABLE");
  }
}

export async function addItem(owner: CartOwner, variantId: string, quantity: number) {
  await assertPurchasable(variantId);
  const { cart, newGuestToken } = await getOrCreateCart(owner);
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const desired = Math.min(MAX_CART_LINE_QTY, (existing && !existing.savedForLater ? existing.quantity : 0) + quantity);
  const stock = await available(variantId);
  if (stock <= 0) throw new AppError("OUT_OF_STOCK", "errors.OUT_OF_STOCK");
  const qty = Math.min(desired, stock);
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: qty, savedForLater: false },
    create: { cartId: cart.id, variantId, quantity: qty },
  });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return { cartId: cart.id, newGuestToken, limited: qty < desired };
}

async function ownedItem(owner: CartOwner, itemId: string) {
  const cart = await findCart(owner);
  if (!cart) throw new AppError("NOT_FOUND");
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
  if (!item) throw new AppError("NOT_FOUND"); // never touch another cart's items (IDOR guard)
  return { cart, item };
}

export async function updateItem(owner: CartOwner, itemId: string, patch: { quantity?: number; savedForLater?: boolean; variantId?: string }) {
  const { cart, item } = await ownedItem(owner, itemId);

  if (patch.variantId && patch.variantId !== item.variantId) {
    // Variant switch (e.g. size change): must belong to the same product.
    const [from, to] = await Promise.all([
      db.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } }),
      db.productVariant.findUnique({ where: { id: patch.variantId }, select: { productId: true } }),
    ]);
    if (!to || to.productId !== from?.productId) throw new AppError("BAD_REQUEST");
    await assertPurchasable(patch.variantId);
    const qty = Math.min(patch.quantity ?? item.quantity, await available(patch.variantId));
    if (qty <= 0) throw new AppError("OUT_OF_STOCK", "errors.OUT_OF_STOCK");
    await db.$transaction([
      db.cartItem.delete({ where: { id: item.id } }),
      db.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId: patch.variantId } },
        update: { quantity: qty },
        create: { cartId: cart.id, variantId: patch.variantId, quantity: qty },
      }),
    ]);
    return;
  }

  const data: { quantity?: number; savedForLater?: boolean } = {};
  if (patch.savedForLater !== undefined) data.savedForLater = patch.savedForLater;
  if (patch.quantity !== undefined) {
    const stock = await available(item.variantId);
    if (stock <= 0) throw new AppError("OUT_OF_STOCK", "errors.OUT_OF_STOCK");
    data.quantity = Math.min(patch.quantity, stock);
  }
  await db.cartItem.update({ where: { id: item.id }, data });
}

export async function removeItem(owner: CartOwner, itemId: string) {
  const { item } = await ownedItem(owner, itemId);
  await db.cartItem.delete({ where: { id: item.id } });
}

export async function setCoupon(owner: CartOwner, code: string | null) {
  const { cart, newGuestToken } = await getOrCreateCart(owner);
  if (code) {
    const result = await loadCoupon(code, owner.userId);
    if ("error" in result) throw new AppError("UNPROCESSABLE", `errors.COUPON_${result.error.toUpperCase()}`);
  }
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  return { newGuestToken };
}

export async function loadCoupon(code: string, userId: string | null): Promise<{ coupon: PricingCoupon & { id: string } } | { error: "invalid" | "expired" | "exhausted" | "used" }> {
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive || coupon.startsAt > now) return { error: "invalid" };
  if (coupon.endsAt && coupon.endsAt < now) return { error: "expired" };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { error: "exhausted" };
  if (userId) {
    const used = await db.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.perUserLimit) return { error: "used" };
  }
  return {
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minSubtotal: coupon.minSubtotal,
      maxDiscount: coupon.maxDiscount,
      sellerId: coupon.sellerId,
    },
  };
}

/** Moves guest cart lines into the customer's cart after login/registration. */
export async function mergeGuestCart(guestToken: string, userId: string) {
  const guest = await db.cart.findUnique({ where: { guestTokenHash: sha256(guestToken) }, include: { items: true } });
  if (!guest) return;
  const { cart } = await getOrCreateCart({ userId, guestToken: null });
  for (const item of guest.items) {
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
      update: { quantity: { increment: item.quantity } },
      create: { cartId: cart.id, variantId: item.variantId, quantity: item.quantity, savedForLater: item.savedForLater },
    });
  }
  await db.cartItem.updateMany({ where: { cartId: cart.id, quantity: { gt: MAX_CART_LINE_QTY } }, data: { quantity: MAX_CART_LINE_QTY } });
  if (!cart.couponCode && guest.couponCode) await db.cart.update({ where: { id: cart.id }, data: { couponCode: guest.couponCode } });
  await db.cart.delete({ where: { id: guest.id } });
}

// ── Read model ──────────────────────────────────────────────────────────────

const EMPTY: CartDTO = {
  id: null,
  lines: [],
  saved: [],
  itemCount: 0,
  couponCode: null,
  totals: { subtotal: 0, discount: 0, shipping: 0, shippingDiscount: 0, tax: 0, total: 0, vatBps: 0 },
  coupon: null,
  groups: [],
};

export async function getCart(owner: CartOwner, opts: { country?: string | null; deliveryMethod?: DeliveryMethodCode } = {}): Promise<CartDTO> {
  const cart = await findCart(owner);
  if (!cart) return EMPTY;
  return buildCart(cart.id, owner.userId, opts);
}

export async function buildCart(cartId: string, userId: string | null, opts: { country?: string | null; deliveryMethod?: DeliveryMethodCode } = {}) {
  const cart = await db.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              inventory: true,
              product: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  status: true,
                  deletedAt: true,
                  shippingCost: true,
                  freeShipping: true,
                  deliveryDaysMin: true,
                  deliveryDaysMax: true,
                  images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
                  variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, inventory: true } },
                  promotions: { where: activePromotionWhere(), select: { discountBps: true }, take: 1 },
                  seller: { select: { id: true, storeName: true, slug: true, status: true, freeShippingThreshold: true, handlingDays: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const lines: CartLineDTO[] = [];
  const saved: CartLineDTO[] = [];
  const pricingLines: PricingLine[] = [];
  const sellers: Record<string, PricingSeller> = {};

  for (const item of cart.items) {
    const v = item.variant;
    const p = v.product;
    const avail = Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0));
    const { price, compareAtPrice } = effectivePrice(v.price, v.compareAtPrice, p.promotions[0]?.discountBps);
    const purchasable = v.isActive && p.status === "ACTIVE" && !p.deletedAt && p.seller.status === "VERIFIED";
    const issue: CartLineDTO["issue"] = !purchasable ? "unavailable" : avail === 0 ? "out_of_stock" : avail < item.quantity ? "insufficient_stock" : null;

    const dto: CartLineDTO = {
      id: item.id,
      variantId: v.id,
      productId: p.id,
      productSlug: p.slug,
      title: p.title,
      variantName: v.name,
      image: p.images[0] ?? null,
      unitPrice: price,
      compareAtPrice,
      quantity: item.quantity,
      lineTotal: price * item.quantity,
      available: avail,
      savedForLater: item.savedForLater,
      seller: { id: p.seller.id, name: p.seller.storeName, slug: p.seller.slug },
      variants: p.variants.map((x) => ({ id: x.id, name: x.name, available: Math.max(0, (x.inventory?.quantity ?? 0) - (x.inventory?.reserved ?? 0)) })),
      issue,
    };

    if (item.savedForLater) {
      saved.push(dto);
      continue;
    }
    lines.push(dto);
    if (issue === "unavailable" || issue === "out_of_stock") continue;
    sellers[p.seller.id] = { id: p.seller.id, freeShippingThreshold: p.seller.freeShippingThreshold, handlingDays: p.seller.handlingDays };
    pricingLines.push({
      key: item.id,
      sellerId: p.seller.id,
      unitPrice: price,
      quantity: Math.min(item.quantity, avail),
      shippingCost: p.shippingCost,
      freeShipping: p.freeShipping,
      deliveryDaysMin: p.deliveryDaysMin,
      deliveryDaysMax: p.deliveryDaysMax,
    });
  }

  let coupon: PricingCoupon | null = null;
  let couponError: string | undefined;
  if (cart.couponCode) {
    const res = await loadCoupon(cart.couponCode, userId);
    if ("coupon" in res) coupon = res.coupon;
    else couponError = res.error;
  }

  const totals = computeTotals({
    lines: pricingLines,
    sellers,
    coupon,
    deliveryMethod: opts.deliveryMethod ?? "STANDARD",
    countryCode: opts.country,
  });

  const sellerNames = Object.fromEntries(lines.map((l) => [l.seller.id, l.seller.name]));
  return {
    id: cart.id,
    lines,
    saved,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    couponCode: cart.couponCode,
    totals: {
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      shippingDiscount: totals.shippingDiscount,
      tax: totals.tax,
      total: totals.total,
      vatBps: totals.vatBps,
    },
    coupon: couponError ? { code: cart.couponCode!, applied: false, reason: couponError } : totals.coupon,
    groups: totals.groups.map((g) => ({ ...g, sellerName: sellerNames[g.sellerId] ?? "" })),
    // Price every delivery method from the same loaded lines (one DB round-trip).
    deliveryOptions: DELIVERY_METHODS.map((method) => {
      const q = computeTotals({ lines: pricingLines, sellers, coupon, deliveryMethod: method, countryCode: opts.country });
      return {
        method,
        shipping: q.shipping - q.shippingDiscount,
        deliveryDaysMin: Math.max(0, ...q.groups.map((g) => g.deliveryDaysMin)),
        deliveryDaysMax: Math.max(0, ...q.groups.map((g) => g.deliveryDaysMax)),
      };
    }),
  } satisfies CartDTO;
}

export async function cartCount(owner: CartOwner) {
  const cart = await findCart(owner);
  if (!cart) return 0;
  const agg = await db.cartItem.aggregate({ where: { cartId: cart.id, savedForLater: false }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}
