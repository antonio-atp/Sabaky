import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getCart } from "@/server/services/cart";
import { cartOwner } from "@/server/context";
import { CartView } from "@/components/cart/cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("cart.title"), robots: { index: false } };
}

export default async function CartPage() {
  const { t, country } = await getI18n();
  const cart = await getCart(await cartOwner(), { country });
  return (
    <div className="container-page py-6 pb-32 lg:pb-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">
        {t("cart.title")} {cart.itemCount > 0 && <span className="text-lg font-medium text-fg-subtle">({cart.itemCount})</span>}
      </h1>
      <CartView initial={cart} />
    </div>
  );
}
