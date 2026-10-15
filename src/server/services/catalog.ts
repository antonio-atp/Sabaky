import "server-only";
import { db } from "../db";
import { cached } from "../cache";
import { applyBps, discountPercent } from "@/shared/money";
import type { CategoryDTO, ProductCardDTO } from "@/shared/types";
import type { Prisma } from "@/generated/prisma/client";
import type { Locale } from "@/shared/config/locales";

/** A product is publicly visible only when active and its seller is verified. */
export const visibleProduct = (): Prisma.ProductWhereInput => ({
  status: "ACTIVE",
  deletedAt: null,
  seller: { status: "VERIFIED" },
});

export const activePromotionWhere = (): Prisma.PromotionProductWhereInput => {
  const now = new Date();
  return { promotion: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } } };
};

export const cardSelect = () =>
  ({
    id: true,
    slug: true,
    title: true,
    price: true,
    compareAtPrice: true,
    ratingAvg: true,
    ratingCount: true,
    salesCount: true,
    freeShipping: true,
    deliveryDaysMax: true,
    totalStock: true,
    isFeatured: true,
    brand: { select: { name: true } },
    seller: { select: { storeName: true, slug: true } },
    images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    promotions: {
      where: activePromotionWhere(),
      select: { discountBps: true, promotion: { select: { endsAt: true } } },
      take: 1,
    },
  }) satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: ReturnType<typeof cardSelect> }>;

/** Applies an active promotion on top of the listed price. */
export function effectivePrice(price: number, compareAt: number | null, promoBps: number | null | undefined) {
  if (!promoBps) return { price, compareAtPrice: compareAt };
  const promoPrice = price - applyBps(price, promoBps);
  return { price: promoPrice, compareAtPrice: Math.max(compareAt ?? price, price) };
}

export function toCard(p: CardRow): ProductCardDTO {
  const promo = p.promotions[0];
  const { price, compareAtPrice } = effectivePrice(p.price, p.compareAtPrice, promo?.discountBps);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    image: p.images[0] ?? null,
    price,
    compareAtPrice,
    discountPct: discountPercent(price, compareAtPrice),
    ratingAvg: Math.round(p.ratingAvg * 10) / 10,
    ratingCount: p.ratingCount,
    salesCount: p.salesCount,
    freeShipping: p.freeShipping,
    deliveryDaysMax: p.deliveryDaysMax,
    inStock: p.totalStock > 0,
    brand: p.brand?.name ?? null,
    seller: { name: p.seller.storeName, slug: p.seller.slug },
    deal: promo ? { endsAt: promo.promotion.endsAt.toISOString(), discountPct: Math.round(promo.discountBps / 100) } : null,
    isFeatured: p.isFeatured,
  };
}

export async function listCards(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[], take = 12, skip = 0) {
  const rows = await db.product.findMany({ where: { AND: [visibleProduct(), where] }, orderBy, take, skip, select: cardSelect() });
  return rows.map(toCard);
}

export async function cardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const cards = await listCards({ id: { in: ids.slice(0, 50) } }, [], 50);
  const order = new Map(ids.map((id, i) => [id, i]));
  return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

// ── Categories ──────────────────────────────────────────────────────────────

type CategoryRow = { id: string; slug: string; name: string; icon: string | null; parentId: string | null; translations: unknown };

const allCategories = () =>
  cached("catalog:categories", 300, () =>
    db.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, icon: true, parentId: true, translations: true },
    }),
  );

/** Localised display name for any category row carrying a translations JSON. */
export function categoryName(c: { name: string; translations: unknown }, locale: string) {
  return ((c.translations ?? {}) as Record<string, string>)[locale] ?? c.name;
}

function localise(c: CategoryRow, locale: Locale): CategoryDTO {
  const tr = (c.translations ?? {}) as Record<string, string>;
  return { id: c.id, slug: c.slug, name: tr[locale] ?? c.name, icon: c.icon };
}

export async function getCategoryTree(locale: Locale): Promise<CategoryDTO[]> {
  const rows = await allCategories();
  return rows
    .filter((c) => !c.parentId)
    .map((root) => ({
      ...localise(root, locale),
      children: rows.filter((c) => c.parentId === root.id).map((c) => localise(c, locale)),
    }));
}

export async function getCategoryBySlug(slug: string, locale: Locale) {
  const rows = await allCategories();
  const cat = rows.find((c) => c.slug === slug);
  if (!cat) return null;
  const parent = cat.parentId ? rows.find((c) => c.id === cat.parentId) : null;
  const children = rows.filter((c) => c.parentId === cat.id);
  return {
    ...localise(cat, locale),
    parent: parent ? localise(parent, locale) : null,
    children: children.map((c) => localise(c, locale)),
    /** The category plus all descendants (for product queries). */
    ids: [cat.id, ...children.map((c) => c.id)],
  };
}

export async function flatCategories(locale: Locale) {
  const rows = await allCategories();
  return rows.map((c) => ({ ...localise(c, locale), parentId: c.parentId }));
}

// ── Home page sections ──────────────────────────────────────────────────────

/**
 * Homepage banners for the visitor's language: banners written for that locale
 * plus language-neutral ones (locale = null); English banners as a fallback.
 */
export async function getBanners(locale: Locale) {
  return cached(`catalog:banners:${locale}`, 120, async () => {
    const now = new Date();
    const live = await db.banner.findMany({
      where: {
        placement: "home_hero",
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        AND: [{ OR: [{ locale: null }, { locale }, { locale: "en" }] }],
      },
      orderBy: { sortOrder: "asc" },
    });
    const pick = (l: string | null) => live.filter((b) => b.locale === l);
    const matching = live.filter((b) => b.locale === locale || b.locale === null);
    return (matching.length ? matching : pick("en")).slice(0, 5);
  });
}

export async function getFlashDeals(take = 12) {
  const promo = await db.promotion.findFirst({
    where: { kind: "FLASH_DEAL", isActive: true, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
    orderBy: { endsAt: "asc" },
    select: { endsAt: true, products: { select: { productId: true }, take: 50 } },
  });
  if (!promo) return { endsAt: null, products: [] as ProductCardDTO[] };
  const products = await listCards({ id: { in: promo.products.map((p) => p.productId) } }, [{ salesCount: "desc" }], take);
  return { endsAt: promo.endsAt.toISOString(), products };
}

export const getFeatured = (take = 12) => listCards({ isFeatured: true }, [{ ratingAvg: "desc" }], take);
export const getBestSellers = (take = 12) => listCards({}, [{ salesCount: "desc" }], take);
export const getPopular = (take = 12) => listCards({}, [{ viewCount: "desc" }], take);
export const getNewArrivals = (take = 12) => listCards({}, [{ publishedAt: "desc" }], take);
export const getTopRated = (take = 12) => listCards({ ratingCount: { gte: 3 } }, [{ ratingAvg: "desc" }, { ratingCount: "desc" }], take);

// ── Product detail ──────────────────────────────────────────────────────────

export async function getProductBySlug(slug: string) {
  const product = await db.product.findFirst({
    where: { slug, ...visibleProduct() },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { inventory: true } },
      brand: true,
      category: { include: { parent: true } },
      seller: {
        select: {
          id: true,
          storeName: true,
          slug: true,
          logoUrl: true,
          ratingAvg: true,
          ratingCount: true,
          countryCode: true,
          createdAt: true,
          handlingDays: true,
          freeShippingThreshold: true,
          _count: { select: { products: { where: { status: "ACTIVE" } } } },
        },
      },
      promotions: { where: activePromotionWhere(), include: { promotion: { select: { endsAt: true, name: true } } }, take: 1 },
    },
  });
  if (!product) return null;

  const promoBps = product.promotions[0]?.discountBps ?? null;
  const variants = product.variants.map((v) => {
    const eff = effectivePrice(v.price, v.compareAtPrice, promoBps);
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      price: eff.price,
      compareAtPrice: eff.compareAtPrice,
      available: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0)),
    };
  });

  const [ratingBreakdown, questions] = await Promise.all([
    db.review.groupBy({ by: ["rating"], where: { productId: product.id, status: "PUBLISHED" }, _count: { _all: true } }),
    db.productQuestion.findMany({
      where: { productId: product.id, status: "ANSWERED" },
      orderBy: { answeredAt: "desc" },
      take: 10,
      select: { id: true, question: true, answer: true, answeredAt: true, createdAt: true },
    }),
  ]);

  return {
    ...product,
    variants,
    specifications: (product.specifications ?? []) as { label: string; value: string }[],
    deal: product.promotions[0]
      ? { endsAt: product.promotions[0].promotion.endsAt.toISOString(), discountPct: Math.round(product.promotions[0].discountBps / 100) }
      : null,
    ratingBreakdown: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: ratingBreakdown.find((b) => b.rating === r)?._count._all ?? 0 })),
    questions,
  };
}
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getProductReviews(productId: string, page = 1, pageSize = 10) {
  const where = { productId, status: "PUBLISHED" as const };
  const [items, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        images: true,
        isVerifiedPurchase: true,
        sellerReply: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    db.review.count({ where }),
  ]);
  // Privacy: show first name + initial only.
  return {
    total,
    items: items.map((r) => ({ ...r, author: displayName(r.user.name), user: undefined })),
  };
}

export function displayName(full: string) {
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

export async function incrementViewCount(productId: string) {
  await db.product.update({ where: { id: productId }, data: { viewCount: { increment: 1 } } }).catch(() => {});
}

// ── Storefront ──────────────────────────────────────────────────────────────

export async function getStorefront(slug: string) {
  return db.seller.findFirst({
    where: { slug, status: "VERIFIED" },
    select: {
      id: true,
      storeName: true,
      slug: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      ratingAvg: true,
      ratingCount: true,
      countryCode: true,
      createdAt: true,
      _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
    },
  });
}
