"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, BellOff, Heart, ShoppingCart, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";
import { api } from "@/lib/api-client";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import type { ProductCardDTO } from "@/shared/types";

export interface WishlistEntry {
  id: string;
  priceAtAdd: number;
  priceChange: number;
  notifyOnPriceDrop: boolean;
  available: boolean;
  defaultVariantId: string | null;
  product: ProductCardDTO;
}

export function WishlistView({ initial }: { initial: WishlistEntry[] }) {
  const { t, price } = useI18n();
  const { addToCart, toggleWishlist } = useShop();
  const [items, setItems] = useState(initial);

  if (!items.length) {
    return <EmptyState icon={<Heart className="h-6 w-6" />} title={t("wishlist.empty")} description={t("wishlist.emptyHint")} action={<ButtonLink href="/">{t("cart.continueShopping")}</ButtonLink>} />;
  }

  async function toggleNotify(entry: WishlistEntry) {
    const next = !entry.notifyOnPriceDrop;
    setItems((all) => all.map((i) => (i.id === entry.id ? { ...i, notifyOnPriceDrop: next } : i)));
    await api(`/wishlist/${entry.product.id}`, { method: "PATCH", body: { notifyOnPriceDrop: next } }).catch(() => {});
  }

  async function remove(entry: WishlistEntry) {
    setItems((all) => all.filter((i) => i.id !== entry.id));
    await toggleWishlist(entry.product.id);
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((entry) => (
        <li key={entry.id} className="card flex gap-4 p-4">
          <Link href={`/p/${entry.product.slug}`} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
            {entry.product.image && <Image src={entry.product.image.url} alt={entry.product.image.alt} fill sizes="112px" className="object-cover" />}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Link href={`/p/${entry.product.slug}`} className="line-clamp-2 text-sm hover:text-brand-700">
              {entry.product.title}
            </Link>
            <p className="text-base font-bold tabular">{price(entry.product.price)}</p>
            {entry.priceChange !== 0 && (
              <p className={`flex items-center gap-1 text-xs font-medium ${entry.priceChange < 0 ? "text-brand-700" : "text-fg-subtle"}`}>
                {entry.priceChange < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                {entry.priceChange < 0
                  ? t("wishlist.priceDropped", { amount: price(-entry.priceChange) })
                  : t("wishlist.priceRose", { amount: price(entry.priceChange) })}
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-1.5">
              <Button size="sm" disabled={!entry.available || !entry.product.inStock || !entry.defaultVariantId} onClick={() => entry.defaultVariantId && addToCart(entry.defaultVariantId)}>
                <ShoppingCart className="h-3.5 w-3.5" /> {t("wishlist.moveToCart")}
              </Button>
              <button onClick={() => toggleNotify(entry)} className="rounded-lg p-2 text-fg-muted hover:bg-surface-sunken" aria-pressed={entry.notifyOnPriceDrop} title={t("wishlist.notifyPriceDrop")} aria-label={t("wishlist.notifyPriceDrop")}>
                {entry.notifyOnPriceDrop ? <Bell className="h-4 w-4 text-brand-600" /> : <BellOff className="h-4 w-4" />}
              </button>
              <button onClick={() => remove(entry)} className="rounded-lg p-2 text-fg-muted hover:bg-berry-50 hover:text-berry-600" aria-label={t("common.remove")}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
