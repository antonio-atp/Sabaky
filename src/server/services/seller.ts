import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { encryptField } from "../security/crypto";
import { invalidate } from "../cache";
import { audit } from "./audit";
import { notify } from "./notifications";
import { syncOrderStatus } from "./orders";
import { priceDropJob } from "./wishlist";
import { flag } from "./risk";
import { getPlatformSettings } from "./settings";
import { discountPercent } from "@/shared/money";
import type { ProductInput } from "@/shared/validation";
import type { Prisma, ShipmentStatus } from "@/generated/prisma/client";

// ── Onboarding ──────────────────────────────────────────────────────────────

export async function registerSeller(
  userId: string,
  emailVerified: boolean,
  input: {
    storeName: string;
    slug: string;
    description: string | null;
    countryCode: string;
    supportEmail: string;
    legalName: string;
    businessType: string;
    registrationNumber: string;
    vatNumber: string | null;
  },
  ipHash: string,
) {
  if (!emailVerified) throw new AppError("FORBIDDEN", "errors.EMAIL_NOT_VERIFIED");
  if (await db.seller.findUnique({ where: { userId } })) throw new AppError("CONFLICT", "errors.ALREADY_SELLER");
  if (await db.seller.findUnique({ where: { slug: input.slug } })) {
    throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { slug: "validation.slugTaken" });
  }

  const { defaultCommissionBps } = await getPlatformSettings();
  const seller = await db.$transaction(async (tx) => {
    const s = await tx.seller.create({
      data: {
        userId,
        commissionBps: defaultCommissionBps,
        storeName: input.storeName,
        slug: input.slug,
        description: input.description,
        countryCode: input.countryCode,
        supportEmail: input.supportEmail,
        freeShippingThreshold: 3500,
      },
    });
    await tx.sellerVerification.create({
      data: {
        sellerId: s.id,
        legalName: input.legalName,
        businessType: input.businessType,
        // Business identifiers are encrypted at rest (AES-256-GCM when a key is configured).
        registrationNumber: encryptField(input.registrationNumber),
        vatNumber: input.vatNumber ? encryptField(input.vatNumber) : null,
        countryCode: input.countryCode,
        documentKeys: [],
      },
    });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { roles: true } });
    if (!user.roles.includes("SELLER")) await tx.user.update({ where: { id: userId }, data: { roles: { push: "SELLER" } } });
    return s;
  });

  const admins = await db.user.findMany({ where: { roles: { has: "ADMIN" }, status: "ACTIVE" }, select: { id: true } });
  for (const a of admins) await notify(a.id, { type: "SELLER_UPDATE", key: "sellerPendingReview", vars: { store: seller.storeName }, href: "/admin/sellers" });
  await audit("seller.registered", { type: "Seller", id: seller.id }, { actorId: userId, ipHash });
  return seller;
}

export async function getSellerForUser(userId: string) {
  return db.seller.findUnique({
    where: { userId },
    include: { verifications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, reviewNotes: true, createdAt: true } } },
  });
}

// ── Dashboard analytics ─────────────────────────────────────────────────────

const PAID_STATUSES = ["PAYMENT_CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export async function sellerDashboard(sellerId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const paidItem: Prisma.OrderItemWhereInput = { sellerId, status: { not: "CANCELLED" }, order: { status: { in: [...PAID_STATUSES] }, placedAt: { gte: since } } };

  const [agg, orderIds, customers, productCount, lowStock, toShip, openQuestions, recent, series, topProducts] = await Promise.all([
    db.orderItem.aggregate({ where: paidItem, _sum: { lineTotal: true, discount: true, commission: true, quantity: true } }),
    db.orderItem.findMany({ where: paidItem, distinct: ["orderId"], select: { orderId: true } }),
    db.orderItem.findMany({ where: paidItem, distinct: ["orderId"], select: { order: { select: { userId: true } } } }),
    db.product.count({ where: { sellerId, deletedAt: null, status: { not: "ARCHIVED" } } }),
    db.inventory.findMany({
      where: { variant: { product: { sellerId, deletedAt: null }, isActive: true }, quantity: { lte: 5 } },
      take: 8,
      orderBy: { quantity: "asc" },
      select: { quantity: true, variant: { select: { id: true, name: true, sku: true, product: { select: { id: true, title: true } } } } },
    }),
    db.shipment.count({ where: { sellerId, status: { in: ["PENDING", "LABEL_CREATED"] }, order: { status: { in: ["PAYMENT_CONFIRMED", "PROCESSING"] } } } }),
    db.productQuestion.count({ where: { product: { sellerId }, status: "PENDING" } }),
    db.shipment.findMany({
      where: { sellerId, order: { status: { not: "PENDING_PAYMENT" } } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, status: true, order: { select: { number: true, placedAt: true, status: true } }, items: { select: { lineTotal: true, quantity: true } } },
    }),
    db.$queryRaw<{ day: Date; sales: bigint; orders: bigint }[]>`
      SELECT date_trunc('day', o."placedAt") AS day,
             COALESCE(SUM(oi."lineTotal" - oi."discount"), 0)::bigint AS sales,
             COUNT(DISTINCT o.id)::bigint AS orders
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE oi."sellerId" = ${sellerId} AND oi.status <> 'CANCELLED'
        AND o.status::text IN ('PAYMENT_CONFIRMED','PROCESSING','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED')
        AND o."placedAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
    db.orderItem.groupBy({
      by: ["productId", "title"],
      where: paidItem,
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
  ]);

  const gross = (agg._sum.lineTotal ?? 0) - (agg._sum.discount ?? 0);
  return {
    sales: gross,
    revenue: gross - (agg._sum.commission ?? 0),
    commission: agg._sum.commission ?? 0,
    units: agg._sum.quantity ?? 0,
    orders: orderIds.length,
    customers: new Set(customers.map((c) => c.order.userId)).size,
    productCount,
    lowStock,
    toShip,
    openQuestions,
    recent,
    series: fillDays(series.map((s) => ({ day: s.day, value: Number(s.sales) })), days),
    topProducts: topProducts.map((t) => ({ productId: t.productId, title: t.title, units: t._sum.quantity ?? 0, sales: t._sum.lineTotal ?? 0 })),
  };
}

export function fillDays(rows: { day: Date; value: number }[], days: number) {
  const map = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r.value]));
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date: d, value: map.get(d) ?? 0 });
  }
  return out;
}

// ── Products ────────────────────────────────────────────────────────────────

export async function listSellerProducts(sellerId: string, opts: { q?: string; status?: string; page?: number } = {}) {
  const where: Prisma.ProductWhereInput = {
    sellerId,
    deletedAt: null,
    ...(opts.status ? { status: opts.status as Prisma.EnumProductStatusFilter["equals"] } : {}),
    ...(opts.q ? { title: { contains: opts.q, mode: "insensitive" } } : {}),
  };
  const page = opts.page ?? 1;
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 20,
      skip: (page - 1) * 20,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        price: true,
        totalStock: true,
        salesCount: true,
        ratingAvg: true,
        moderationNote: true,
        updatedAt: true,
        images: { take: 1, select: { url: true, alt: true } },
        _count: { select: { variants: true } },
      },
    }),
    db.product.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / 20)) };
}

export async function getSellerProduct(sellerId: string, productId: string) {
  const p = await db.product.findFirst({
    where: { id: productId, sellerId, deletedAt: null },
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" }, include: { inventory: true } }, brand: true },
  });
  if (!p) throw new AppError("NOT_FOUND");
  return p;
}

function slugify(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "product";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const clash = await db.product.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!clash) return candidate;
  }
  throw new AppError("CONFLICT");
}

/** Create or update a product with variants, inventory and images. */
export async function saveProduct(sellerId: string, actorId: string, input: ProductInput, productId?: string) {
  const seller = await db.seller.findUniqueOrThrow({ where: { id: sellerId }, select: { status: true } });
  if (seller.status === "SUSPENDED" || seller.status === "REJECTED") throw new AppError("FORBIDDEN", "errors.SELLER_NOT_ACTIVE");

  const category = await db.category.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true } });
  if (!category) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { categoryId: "validation.invalid" });

  // SKUs are globally unique; reject collisions with other products.
  const skuClash = await db.productVariant.findFirst({
    where: { sku: { in: input.variants.map((v) => v.sku) }, ...(productId ? { productId: { not: productId } } : {}) },
    select: { sku: true },
  });
  if (skuClash) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { variants: "validation.skuTaken" });

  const existing = productId ? await db.product.findFirst({ where: { id: productId, sellerId, deletedAt: null }, include: { variants: true } }) : null;
  if (productId && !existing) throw new AppError("NOT_FOUND");

  const brand = input.brandName
    ? await db.brand.upsert({ where: { name: input.brandName }, update: {}, create: { name: input.brandName, slug: `${slugify(input.brandName)}-${Math.random().toString(36).slice(2, 6)}` } })
    : null;

  const active = input.variants.filter((v) => v.isActive);
  const cheapest = [...(active.length ? active : input.variants)].sort((a, b) => a.price - b.price)[0];
  const totalStock = active.reduce((s, v) => s + v.stock, 0);
  const settings = await getPlatformSettings();

  let status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" = "DRAFT";
  if (input.publish) status = seller.status === "VERIFIED" && !settings.requireProductApproval ? "ACTIVE" : "PENDING_REVIEW";

  const data = {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    brandId: brand?.id ?? null,
    condition: input.condition,
    highlights: input.highlights,
    specifications: input.specifications,
    price: cheapest.price,
    compareAtPrice: cheapest.compareAtPrice ?? null,
    discountPct: discountPercent(cheapest.price, cheapest.compareAtPrice),
    shippingCost: input.freeShipping ? 0 : input.shippingCost,
    freeShipping: input.freeShipping,
    deliveryDaysMin: input.deliveryDaysMin,
    deliveryDaysMax: input.deliveryDaysMax,
    totalStock,
    status,
    moderationNote: null,
    publishedAt: status === "ACTIVE" ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
  };

  const product = await db.$transaction(async (tx) => {
    const p = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data: { ...data, sellerId, slug: await uniqueSlug(input.title) } });

    await tx.productImage.deleteMany({ where: { productId: p.id } });
    await tx.productImage.createMany({ data: input.images.map((img, i) => ({ productId: p.id, url: img.url, alt: img.alt, sortOrder: i })) });

    const keepIds = input.variants.map((v) => v.id).filter(Boolean) as string[];
    if (existing) {
      // Variants referenced by past orders cannot be deleted — deactivate instead.
      await tx.productVariant.updateMany({ where: { productId: p.id, id: { notIn: keepIds } }, data: { isActive: false } });
    }
    for (const [i, v] of input.variants.entries()) {
      const variantData = {
        sku: v.sku,
        name: v.name,
        color: v.color,
        colorHex: v.colorHex ?? null,
        size: v.size,
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? null,
        isActive: v.isActive,
        sortOrder: i,
      };
      const owned = v.id && existing?.variants.some((ev) => ev.id === v.id);
      const variant = owned
        ? await tx.productVariant.update({ where: { id: v.id }, data: variantData })
        : await tx.productVariant.create({ data: { ...variantData, productId: p.id } });
      await tx.inventory.upsert({ where: { variantId: variant.id }, update: { quantity: v.stock }, create: { variantId: variant.id, quantity: v.stock } });
    }
    return p;
  });

  if (existing && cheapest.price < existing.price) priceDropJob.enqueue({ productId: product.id, newPrice: cheapest.price, title: product.title });

  // Seller-abuse heuristic: absurd compare-at prices to fake discounts.
  if (data.discountPct >= 85) await flag({ type: "SELLER_ABUSE", score: 50, sellerId, details: { productId: product.id, reason: "suspicious_discount", discountPct: data.discountPct } });

  await audit(existing ? "product.updated" : "product.created", { type: "Product", id: product.id }, { actorId, metadata: { status } });
  invalidate("catalog:");
  return product;
}

export async function archiveProduct(sellerId: string, actorId: string, productId: string) {
  const res = await db.product.updateMany({ where: { id: productId, sellerId, deletedAt: null }, data: { status: "ARCHIVED", deletedAt: new Date() } });
  if (!res.count) throw new AppError("NOT_FOUND");
  await db.cartItem.deleteMany({ where: { variant: { productId }, savedForLater: false } });
  await audit("product.archived", { type: "Product", id: productId }, { actorId });
}

export async function updateInventory(sellerId: string, variantId: string, input: { quantity: number; price?: number }) {
  const variant = await db.productVariant.findFirst({ where: { id: variantId, product: { sellerId } }, include: { product: true } });
  if (!variant) throw new AppError("NOT_FOUND");
  await db.$transaction(async (tx) => {
    await tx.inventory.upsert({ where: { variantId }, update: { quantity: input.quantity }, create: { variantId, quantity: input.quantity } });
    if (input.price) await tx.productVariant.update({ where: { id: variantId }, data: { price: input.price } });
    const variants = await tx.productVariant.findMany({ where: { productId: variant.productId, isActive: true }, include: { inventory: true } });
    const cheapest = [...variants].sort((a, b) => a.price - b.price)[0];
    await tx.product.update({
      where: { id: variant.productId },
      data: {
        totalStock: variants.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0),
        ...(cheapest ? { price: cheapest.price, compareAtPrice: cheapest.compareAtPrice, discountPct: discountPercent(cheapest.price, cheapest.compareAtPrice) } : {}),
      },
    });
  });
  if (input.price && input.price < variant.price) priceDropJob.enqueue({ productId: variant.productId, newPrice: input.price, title: variant.product.title });
}

// ── Orders & shipments ──────────────────────────────────────────────────────

export async function listSellerShipments(sellerId: string, status?: string, page = 1) {
  const where: Prisma.ShipmentWhereInput = {
    sellerId,
    order: { status: { notIn: ["PENDING_PAYMENT"] } },
    ...(status === "to_ship" ? { status: { in: ["PENDING", "LABEL_CREATED"] }, order: { status: { in: ["PAYMENT_CONFIRMED", "PROCESSING"] } } } : {}),
    ...(status === "in_transit" ? { status: { in: ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } } : {}),
    ...(status === "delivered" ? { status: "DELIVERED" } : {}),
  };
  const [items, total] = await Promise.all([
    db.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: (page - 1) * 20,
      include: {
        order: { select: { number: true, status: true, placedAt: true, deliveryMethod: true, shippingAddress: true } },
        items: { select: { id: true, title: true, variantName: true, quantity: true, lineTotal: true, discount: true, imageUrl: true, status: true } },
      },
    }),
    db.shipment.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / 20)) };
}

const SHIPMENT_FLOW: ShipmentStatus[] = ["PENDING", "LABEL_CREATED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function updateShipment(
  sellerId: string,
  actorId: string,
  shipmentId: string,
  input: { status: ShipmentStatus; carrier: string | null; trackingNumber?: string | null; location: string | null },
) {
  const shipment = await db.shipment.findFirst({ where: { id: shipmentId, sellerId }, include: { order: true } });
  if (!shipment) throw new AppError("NOT_FOUND");
  if (["PENDING_PAYMENT", "CANCELLED", "REFUNDED"].includes(shipment.order.status)) throw new AppError("CONFLICT", "errors.ORDER_NOT_SHIPPABLE");
  if (SHIPMENT_FLOW.indexOf(input.status) <= SHIPMENT_FLOW.indexOf(shipment.status)) throw new AppError("CONFLICT", "errors.SHIPMENT_BACKWARDS");
  if (input.status === "SHIPPED" && !(input.trackingNumber || shipment.trackingNumber)) {
    throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { trackingNumber: "validation.required" });
  }

  await db.$transaction([
    db.shipment.update({
      where: { id: shipment.id },
      data: {
        status: input.status,
        carrier: input.carrier ?? shipment.carrier,
        trackingNumber: input.trackingNumber ?? shipment.trackingNumber,
        ...(input.status === "SHIPPED" ? { shippedAt: new Date() } : {}),
        ...(input.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
    }),
    db.shipmentEvent.create({ data: { shipmentId: shipment.id, status: input.status, location: input.location, description: `status.${input.status}` } }),
  ]);
  if (shipment.order.status === "PAYMENT_CONFIRMED") {
    await db.order.update({ where: { id: shipment.orderId }, data: { status: "PROCESSING" } });
    await db.orderEvent.create({ data: { orderId: shipment.orderId, status: "PROCESSING", actorId } });
  }
  await syncOrderStatus(shipment.orderId, actorId);
  await audit("shipment.updated", { type: "Shipment", id: shipment.id }, { actorId, metadata: { status: input.status } });
}

// ── Customers, Q&A, reviews, settings ───────────────────────────────────────

export async function sellerCustomers(sellerId: string) {
  const rows = await db.orderItem.groupBy({
    by: ["orderId"],
    where: { sellerId, status: { not: "CANCELLED" }, order: { status: { in: [...PAID_STATUSES] } } },
    _sum: { lineTotal: true },
  });
  const orders = await db.order.findMany({
    where: { id: { in: rows.map((r) => r.orderId) } },
    select: { id: true, placedAt: true, user: { select: { id: true, name: true, countryCode: true } } },
  });
  const byUser = new Map<string, { name: string; orders: number; spent: number; lastOrder: Date }>();
  for (const o of orders) {
    const spent = rows.find((r) => r.orderId === o.id)?._sum.lineTotal ?? 0;
    const cur = byUser.get(o.user.id) ?? { name: o.user.name, orders: 0, spent: 0, lastOrder: o.placedAt };
    cur.orders += 1;
    cur.spent += spent;
    if (o.placedAt > cur.lastOrder) cur.lastOrder = o.placedAt;
    byUser.set(o.user.id, cur);
  }
  return [...byUser.values()].sort((a, b) => b.spent - a.spent);
}

export const listSellerQuestions = (sellerId: string) =>
  db.productQuestion.findMany({
    where: { product: { sellerId }, status: { not: "HIDDEN" } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: { product: { select: { title: true, slug: true } } },
  });

export const listSellerReviews = (sellerId: string) =>
  db.review.findMany({
    where: { product: { sellerId }, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: { select: { title: true, slug: true } }, user: { select: { name: true } } },
  });

export async function replyToReview(sellerId: string, actorId: string, reviewId: string, reply: string) {
  const res = await db.review.updateMany({ where: { id: reviewId, product: { sellerId } }, data: { sellerReply: reply, sellerRepliedAt: new Date() } });
  if (!res.count) throw new AppError("NOT_FOUND");
  await audit("seller.review_replied", { type: "Review", id: reviewId }, { actorId });
}

export async function updateStoreSettings(
  sellerId: string,
  actorId: string,
  input: { storeName: string; description: string | null; supportEmail: string; logoUrl: string | null; bannerUrl: string | null; freeShippingThreshold?: number | null; handlingDays: number },
) {
  await db.seller.update({ where: { id: sellerId }, data: input });
  await audit("seller.settings_updated", { type: "Seller", id: sellerId }, { actorId });
}
