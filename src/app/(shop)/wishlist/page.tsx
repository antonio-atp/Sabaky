import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getWishlist } from "@/server/services/wishlist";
import { WishlistView } from "@/components/account/wishlist-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.wishlist"), robots: { index: false } };
}

export default async function WishlistPage() {
  const user = await requireUser("/wishlist");
  const { t } = await getI18n();
  const items = await getWishlist(user.id);
  return (
    <div className="container-page py-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{t("nav.wishlist")}</h1>
      <p className="mb-5 text-sm text-fg-muted">{t("wishlist.subtitle")}</p>
      <WishlistView
        initial={items.map((i) => ({
          id: i.id,
          priceAtAdd: i.priceAtAdd,
          priceChange: i.priceChange,
          notifyOnPriceDrop: i.notifyOnPriceDrop,
          available: i.available,
          defaultVariantId: i.defaultVariantId,
          product: i.product,
        }))}
      />
    </div>
  );
}
