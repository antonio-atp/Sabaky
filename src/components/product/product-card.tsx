"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Truck, Zap } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";
import { Rating } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { ProductCardDTO } from "@/shared/types";

function compact(n: number, intl: string) {
  return new Intl.NumberFormat(intl, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function ProductCard({ product, priority, className }: { product: ProductCardDTO; priority?: boolean; className?: string }) {
  const { t, price, intl } = useI18n();
  const { isWishlisted, toggleWishlist } = useShop();
  const wished = isWishlisted(product.id);

  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]", className)}>
      <Link href={`/p/${product.slug}`} className="relative block aspect-square overflow-hidden bg-surface-sunken">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 240px, (min-width: 768px) 25vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-3.5rem)] flex-col items-start gap-1">
          {product.deal && (
            <span className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-sunrise-400 px-1.5 py-0.5 text-[11px] font-bold text-ink-950" title={t("product.flashDeal")}>
              <Zap className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden /> <span className="truncate">{t("product.flashDeal")}</span>
            </span>
          )}
          {product.discountPct > 0 && <span className="rounded-md bg-berry-600 px-1.5 py-0.5 text-[11px] font-bold text-white">-{product.discountPct}%</span>}
        </div>
        {!product.inStock && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-ink-900/80 py-1 text-center text-xs font-semibold text-white">{t("product.outOfStock")}</span>
        )}
      </Link>

      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-pressed={wished}
        aria-label={wished ? t("wishlist.remove") : t("wishlist.add")}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-surface/90 shadow-sm backdrop-blur transition hover:scale-105"
      >
        <Heart className={cn("h-4 w-4", wished ? "fill-berry-600 text-berry-600" : "text-fg-muted")} />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={`/p/${product.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-fg hover:text-brand-700">
          {product.title}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={cn("text-lg font-bold tracking-tight tabular", product.discountPct > 0 ? "text-berry-600" : "text-fg")}>{price(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-xs text-fg-subtle line-through tabular">{price(product.compareAtPrice)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-fg-subtle">
          {product.ratingCount > 0 && <Rating value={product.ratingAvg} />}
          {product.salesCount > 0 && <span className="tabular">{t("product.sold", { count: compact(product.salesCount, intl) })}</span>}
        </div>
        <p className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-brand-700">
          <Truck className="h-3.5 w-3.5" aria-hidden />
          {product.freeShipping ? t("product.freeShipping") : t("product.deliveryIn", { days: product.deliveryDaysMax })}
        </p>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-6 w-1/3" />
      </div>
    </div>
  );
}
