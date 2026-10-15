"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import type { CartDTO } from "@/shared/types";

/** Transparent totals: subtotal, discounts, shipping, VAT (included), total. */
export function OrderSummary({ totals, itemCount, children, shippingLabel }: { totals: CartDTO["totals"]; itemCount: number; children?: ReactNode; shippingLabel?: string }) {
  const { t, price, currency } = useI18n();
  const shipping = totals.shipping - totals.shippingDiscount;
  return (
    <div className="space-y-3">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-muted">{t("cart.subtotal", { count: itemCount })}</dt>
          <dd className="tabular">{price(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-berry-600">
            <dt>{t("cart.discount")}</dt>
            <dd className="tabular">−{price(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-fg-muted">{shippingLabel ?? t("cart.shipping")}</dt>
          <dd className="tabular">
            {shipping === 0 ? <span className="font-medium text-brand-700">{t("cart.free")}</span> : price(shipping)}
            {totals.shippingDiscount > 0 && <span className="ml-1.5 text-xs text-fg-subtle line-through">{price(totals.shipping)}</span>}
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
          <dt>{t("cart.total")}</dt>
          <dd className="tabular">{price(totals.total)}</dd>
        </div>
        <div className="flex justify-between text-xs text-fg-subtle">
          <dt>{t("cart.vatIncluded", { rate: (totals.vatBps / 100).toFixed(0) })}</dt>
          <dd className="tabular">{price(totals.tax)}</dd>
        </div>
      </dl>
      {currency !== "EUR" && <p className="text-xs text-fg-subtle">{t("cart.chargedInEur", { amount: new Intl.NumberFormat("en", { style: "currency", currency: "EUR" }).format(totals.total / 100) })}</p>}
      {children}
    </div>
  );
}
