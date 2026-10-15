import "server-only";
import { db } from "../db";
import { cardSelect, toCard, visibleProduct } from "./catalog";
import { PAGE_SIZE, type SortOption } from "@/shared/constants";
import type { SearchParams } from "@/shared/validation";
import type { ProductCardDTO } from "@/shared/types";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Search engine port. v1 runs on PostgreSQL (ILIKE backed by pg_trgm GIN
 * indexes — see the `search_indexes` migration). The interface is shaped so
 * a dedicated engine (Meilisearch, OpenSearch, Typesense, or a vector index
 * for semantic search) can replace it without touching routes or UI.
 */
export interface SearchResult {
  items: ProductCardDTO[];
  total: number;
  page: number;
  pageCount: number;
  facets: {
    brands: { name: string; slug: string; count: number }[];
    categories: { id: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

export interface SearchEngine {
  search(params: SearchParams & { categoryIds?: string[]; sellerId?: string }): Promise<SearchResult>;
  suggest(prefix: string): Promise<{ products: { title: string; slug: string }[]; categories: { name: string; slug: string }[]; brands: { name: string; slug: string }[] }>;
}

const terms = (q: string | undefined) =>
  (q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[%_\\]/g, ""))
    .filter((t) => t.length >= 2)
    .slice(0, 6);

function textWhere(q: string | undefined): Prisma.ProductWhereInput | undefined {
  const words = terms(q);
  if (!words.length) return undefined;
  return {
    AND: words.map((w) => ({
      OR: [
        { title: { contains: w, mode: "insensitive" as const } },
        { brand: { name: { contains: w, mode: "insensitive" as const } } },
        { seller: { storeName: { contains: w, mode: "insensitive" as const } } },
        { category: { name: { contains: w, mode: "insensitive" as const } } },
      ],
    })),
  };
}

const ORDER: Record<SortOption, Prisma.ProductOrderByWithRelationInput[]> = {
  // Until a ranking model exists, relevance = text match filtered, then popularity & quality.
  relevance: [{ isFeatured: "desc" }, { salesCount: "desc" }, { ratingAvg: "desc" }],
  price_asc: [{ price: "asc" }],
  price_desc: [{ price: "desc" }],
  rating: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
  popular: [{ salesCount: "desc" }],
  newest: [{ publishedAt: "desc" }],
  discount: [{ discountPct: "desc" }],
};

class PostgresSearchEngine implements SearchEngine {
  async search(params: SearchParams & { categoryIds?: string[]; sellerId?: string }): Promise<SearchResult> {
    const filters: Prisma.ProductWhereInput[] = [visibleProduct()];
    const text = textWhere(params.q);
    if (text) filters.push(text);
    if (params.categoryIds?.length) filters.push({ categoryId: { in: params.categoryIds } });
    if (params.sellerId) filters.push({ sellerId: params.sellerId });
    else if (params.seller) filters.push({ seller: { slug: params.seller } });

    // Facets are computed before brand/price filters so users can widen them again.
    const facetBase: Prisma.ProductWhereInput = { AND: [...filters] };

    if (params.brand.length) filters.push({ brand: { slug: { in: params.brand } } });
    if (params.minPrice != null) filters.push({ price: { gte: params.minPrice } });
    if (params.maxPrice != null) filters.push({ price: { lte: params.maxPrice } });
    if (params.rating) filters.push({ ratingAvg: { gte: params.rating } });
    if (params.inStock) filters.push({ totalStock: { gt: 0 } });
    if (params.freeShipping) filters.push({ freeShipping: true });
    if (params.onSale) filters.push({ discountPct: { gt: 0 } });
    if (params.maxDays) filters.push({ deliveryDaysMax: { lte: params.maxDays } });
    if (params.condition) filters.push({ condition: params.condition });

    const where: Prisma.ProductWhereInput = { AND: filters };
    const page = params.page;
    const [rows, total, brandGroups, categoryGroups, priceAgg] = await Promise.all([
      db.product.findMany({ where, orderBy: [...ORDER[params.sort], { id: "asc" }], take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, select: cardSelect() }),
      db.product.count({ where }),
      db.product.groupBy({ by: ["brandId"], where: { AND: [facetBase, { brandId: { not: null } }] }, _count: { _all: true }, orderBy: { _count: { brandId: "desc" } }, take: 15 }),
      db.product.groupBy({ by: ["categoryId"], where: facetBase, _count: { _all: true } }),
      db.product.aggregate({ where: facetBase, _min: { price: true }, _max: { price: true } }),
    ]);

    const brandIds = brandGroups.map((b) => b.brandId!).filter(Boolean);
    const brands = brandIds.length ? await db.brand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true, slug: true } }) : [];

    return {
      items: rows.map(toCard),
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      facets: {
        brands: brandGroups
          .map((g) => {
            const b = brands.find((x) => x.id === g.brandId);
            return b ? { name: b.name, slug: b.slug, count: g._count._all } : null;
          })
          .filter((b): b is NonNullable<typeof b> => !!b),
        categories: categoryGroups.map((g) => ({ id: g.categoryId, count: g._count._all })),
        priceRange: { min: priceAgg._min.price ?? 0, max: priceAgg._max.price ?? 0 },
      },
    };
  }

  async suggest(prefix: string) {
    const q = prefix.trim().replace(/[%_\\]/g, "");
    if (q.length < 2) return { products: [], categories: [], brands: [] };
    const [products, categories, brands] = await Promise.all([
      db.product.findMany({
        where: { AND: [visibleProduct(), { title: { contains: q, mode: "insensitive" } }] },
        orderBy: { salesCount: "desc" },
        take: 6,
        select: { title: true, slug: true },
      }),
      db.category.findMany({ where: { isActive: true, name: { contains: q, mode: "insensitive" } }, take: 3, select: { name: true, slug: true } }),
      db.brand.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: 3, select: { name: true, slug: true } }),
    ]);
    return { products, categories, brands };
  }
}

export const searchEngine: SearchEngine = new PostgresSearchEngine();
