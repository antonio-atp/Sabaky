import "server-only";
import { cookies } from "next/headers";
import { db } from "../db";
import { COOKIE } from "@/lib/cookies";
import { listCards } from "./catalog";
import type { ProductCardDTO } from "@/shared/types";

/**
 * Recommendation port. v1 = transparent heuristics over behavioural signals
 * (UserEvent, orders, wishlist). The same interface can later be served by a
 * collaborative-filtering / embedding model or an external service; callers
 * (home page, product page, cart, AI assistant) do not change.
 */
export interface Recommender {
  forUser(userId: string | null, take?: number): Promise<{ items: ProductCardDTO[]; personalised: boolean }>;
  similar(productId: string, categoryId: string, take?: number): Promise<ProductCardDTO[]>;
  boughtTogether(productId: string, take?: number): Promise<ProductCardDTO[]>;
}

class HeuristicRecommender implements Recommender {
  async forUser(userId: string | null, take = 12) {
    if (userId) {
      const signals = await db.userEvent.findMany({
        where: { userId, productId: { not: null }, type: { in: ["VIEW", "ADD_TO_CART", "WISHLIST", "PURCHASE"] } },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { productId: true, product: { select: { categoryId: true } } },
      });
      const seen = new Set(signals.map((s) => s.productId!));
      const categoryScores = new Map<string, number>();
      signals.forEach((s, i) => {
        const cat = s.product?.categoryId;
        if (cat) categoryScores.set(cat, (categoryScores.get(cat) ?? 0) + 1 / (1 + i / 10)); // recency-weighted
      });
      const topCategories = [...categoryScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
      if (topCategories.length) {
        const items = await listCards(
          { categoryId: { in: topCategories }, id: { notIn: [...seen].slice(0, 100) } },
          [{ ratingAvg: "desc" }, { salesCount: "desc" }],
          take,
        );
        if (items.length >= 4) return { items, personalised: true };
      }
    }
    // Cold start: quality × popularity.
    return { items: await listCards({ ratingAvg: { gte: 4 } }, [{ salesCount: "desc" }], take), personalised: false };
  }

  similar(productId: string, categoryId: string, take = 12) {
    return listCards({ categoryId, id: { not: productId } }, [{ salesCount: "desc" }, { ratingAvg: "desc" }], take);
  }

  async boughtTogether(productId: string, take = 4) {
    // Products co-occurring in the same orders, ranked by frequency.
    const orders = await db.orderItem.findMany({ where: { productId }, select: { orderId: true }, take: 500, orderBy: { id: "desc" } });
    if (!orders.length) return [];
    const co = await db.orderItem.groupBy({
      by: ["productId"],
      where: { orderId: { in: orders.map((o) => o.orderId) }, productId: { not: productId } },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take,
    });
    const ids = co.map((c) => c.productId);
    const cards = await listCards({ id: { in: ids } }, [], take);
    return ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is ProductCardDTO => !!c);
  }
}

export const recommender: Recommender = new HeuristicRecommender();

/** Behavioural profiling only with the visitor's personalisation consent (GDPR / ePrivacy). */
async function personalisationAllowed() {
  try {
    return ((await cookies()).get(COOKIE.consent)?.value ?? "").includes("p");
  } catch {
    return false; // outside a request scope (jobs) → no tracking
  }
}

export async function trackEvent(input: { userId: string | null; type: "VIEW" | "SEARCH" | "ADD_TO_CART" | "WISHLIST" | "PURCHASE"; productId?: string; query?: string }) {
  if (!input.userId || !(await personalisationAllowed())) return;
  await db.userEvent
    .create({ data: { userId: input.userId, type: input.type, productId: input.productId, query: input.query?.slice(0, 120) } })
    .catch(() => {});
}
