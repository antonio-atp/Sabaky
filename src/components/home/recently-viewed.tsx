"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { ProductRail } from "@/components/product/product-grid";
import type { ProductCardDTO } from "@/shared/types";

const KEY = "sabaky.recentlyViewed";

/** Stored on-device only (no server profile needed) — privacy-friendly. */
export function rememberViewed(productId: string) {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    localStorage.setItem(KEY, JSON.stringify([productId, ...ids.filter((x) => x !== productId)].slice(0, 20)));
  } catch {
    /* storage unavailable */
  }
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { t } = useI18n();
  const [products, setProducts] = useState<ProductCardDTO[]>([]);

  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).filter((id) => id !== excludeId).slice(0, 10);
    } catch {}
    if (!ids.length) return;
    api<ProductCardDTO[]>(`/products/batch?ids=${ids.join(",")}`)
      .then(setProducts)
      .catch(() => {});
  }, [excludeId]);

  return <ProductRail title={t("home.recentlyViewed")} icon={<History className="h-5 w-5 text-fg-subtle" />} products={products} />;
}

export function TrackView({ productId }: { productId: string }) {
  useEffect(() => {
    rememberViewed(productId);
    api("/events", { body: { type: "VIEW", productId } }).catch(() => {});
  }, [productId]);
  return null;
}
