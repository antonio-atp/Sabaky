"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";

export function CartButton() {
  const { t } = useI18n();
  const { cartCount } = useShop();
  return (
    <Link href="/cart" className="relative flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-sunken" aria-label={t("nav.cartWithCount", { count: cartCount })}>
      <span className="relative">
        <ShoppingCart className="h-6 w-6 text-fg" aria-hidden />
        {cartCount > 0 && (
          <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-sunrise-400 px-1 text-[11px] font-bold text-ink-950 tabular">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </span>
      <span className="hidden text-sm font-semibold text-fg lg:inline">{t("nav.cart")}</span>
    </Link>
  );
}

export function WishlistButton() {
  const { t } = useI18n();
  return (
    <Link href="/wishlist" className="hidden rounded-xl p-2 hover:bg-surface-sunken sm:block" aria-label={t("nav.wishlist")}>
      <Heart className="h-5.5 w-5.5 text-fg" aria-hidden />
    </Link>
  );
}
