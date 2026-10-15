"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Minus, Plus, Share2, ShieldCheck, Truck, Zap } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Countdown } from "./countdown";
import { discountPercent, vatFromGross } from "@/shared/money";
import { COUNTRIES } from "@/shared/config/countries";
import { cn } from "@/lib/utils";

export interface PanelVariant {
  id: string;
  name: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  price: number;
  compareAtPrice: number | null;
  available: number;
}

interface Props {
  productId: string;
  variants: PanelVariant[];
  shippingCost: number;
  freeShipping: boolean;
  freeShippingThreshold: number | null;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  deal: { endsAt: string; discountPct: number } | null;
}

export function PurchasePanel(props: Props) {
  const { t, price, date, country } = useI18n();
  const { addToCart, isWishlisted, toggleWishlist } = useShop();
  const toast = useToast();
  const router = useRouter();

  const colors = useMemo(() => [...new Map(props.variants.filter((v) => v.color).map((v) => [v.color!, v.colorHex])).entries()], [props.variants]);
  const sizes = useMemo(() => [...new Set(props.variants.map((v) => v.size).filter(Boolean) as string[])], [props.variants]);
  const firstAvailable = props.variants.find((v) => v.available > 0) ?? props.variants[0];
  const [color, setColor] = useState(firstAvailable?.color ?? null);
  const [size, setSize] = useState(firstAvailable?.size ?? null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [now] = useState(() => Date.now());

  const variant =
    props.variants.find((v) => (colors.length ? v.color === color : true) && (sizes.length ? v.size === size : true)) ??
    props.variants.find((v) => v.color === color) ??
    firstAvailable;

  const available = variant?.available ?? 0;
  const quantity = Math.min(qty, Math.max(1, available));
  const unit = variant?.price ?? 0;
  const pct = discountPercent(unit, variant?.compareAtPrice);
  const subtotal = unit * quantity;
  const savings = variant?.compareAtPrice && variant.compareAtPrice > unit ? (variant.compareAtPrice - unit) * quantity : 0;
  const threshold = props.freeShippingThreshold;
  const shipping = props.freeShipping || (threshold != null && subtotal >= threshold) ? 0 : props.shippingCost;
  const total = subtotal + shipping;
  const vatBps = COUNTRIES[country]?.vatBps ?? 0;
  const eta = (days: number) => date(new Date(now + days * 86_400_000), { weekday: "short", day: "numeric", month: "short" });

  async function add(buyNow: boolean) {
    if (!variant) return;
    setBusy(buyNow ? "buy" : "cart");
    const ok = await addToCart(variant.id, quantity);
    setBusy(null);
    if (ok && buyNow) router.push("/checkout");
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: document.title });
      else {
        await navigator.clipboard.writeText(url);
        toast("success", "product.linkCopied");
      }
    } catch {
      /* user cancelled */
    }
  }

  const wished = isWishlisted(props.productId);

  return (
    <div className="space-y-5">
      {props.deal && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-sunrise-400 to-berry-500 px-4 py-2.5 text-ink-950">
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <Zap className="h-4 w-4" fill="currentColor" aria-hidden /> {t("product.flashDeal")} · -{props.deal.discountPct}%
          </span>
          <Countdown endsAt={props.deal.endsAt} className="inline-flex items-center" />
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("text-3xl font-extrabold tracking-tight tabular", pct ? "text-berry-600" : "text-fg")}>{price(unit)}</span>
          {pct > 0 && (
            <>
              <span className="text-base text-fg-subtle line-through tabular">{price(variant!.compareAtPrice!)}</span>
              <span className="rounded-md bg-berry-50 px-2 py-0.5 text-sm font-bold text-berry-700">-{pct}%</span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-fg-subtle">{t("product.vatIncluded")}</p>
      </div>

      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            {t("product.color")}: <span className="text-fg-muted">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map(([name, hex]) => {
              const stock = props.variants.filter((v) => v.color === name).reduce((s, v) => s + v.available, 0);
              return (
                <button
                  key={name}
                  onClick={() => setColor(name)}
                  aria-pressed={color === name}
                  aria-label={name}
                  title={name}
                  className={cn("relative grid h-10 w-10 place-items-center rounded-full border-2 transition", color === name ? "border-brand-600" : "border-line hover:border-line-strong", !stock && "opacity-40")}
                >
                  <span className="h-7 w-7 rounded-full ring-1 ring-black/10" style={{ background: hex ?? "#ccc" }} />
                  {color === name && <Check className="absolute h-4 w-4 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">{t("product.size")}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const v = props.variants.find((x) => x.size === s && (!colors.length || x.color === color));
              const out = !v || v.available === 0;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  disabled={!v}
                  className={cn(
                    "h-10 min-w-12 rounded-xl border px-3 text-sm font-medium transition",
                    size === s ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line-strong hover:border-fg-subtle",
                    out && "text-fg-subtle line-through",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-11 items-center rounded-xl border border-line-strong">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-full w-10 place-items-center text-fg-muted hover:text-fg disabled:opacity-40" disabled={quantity <= 1} aria-label={t("cart.decrease")}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-semibold tabular" aria-live="polite">
            {quantity}
          </span>
          <button onClick={() => setQty((q) => Math.min(available, q + 1, 99))} className="grid h-full w-10 place-items-center text-fg-muted hover:text-fg disabled:opacity-40" disabled={quantity >= available} aria-label={t("cart.increase")}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className={cn("text-sm font-medium", available === 0 ? "text-berry-600" : available <= 5 ? "text-sunrise-600" : "text-brand-700")}>
          {available === 0 ? t("product.outOfStock") : available <= 5 ? t("product.onlyLeft", { count: available }) : t("product.inStock")}
        </p>
      </div>

      {/* Transparent cost breakdown: price, discount, shipping, VAT, total */}
      <dl className="space-y-1.5 rounded-2xl bg-surface-muted p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-muted">{t("product.itemsPrice", { count: quantity })}</dt>
          <dd className="tabular">{price(subtotal)}</dd>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-berry-600">
            <dt>{t("product.youSave")}</dt>
            <dd className="tabular">−{price(savings)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-fg-muted">{t("cart.shipping")}</dt>
          <dd className="tabular">{shipping === 0 ? <span className="font-medium text-brand-700">{t("cart.free")}</span> : price(shipping)}</dd>
        </div>
        <div className="flex justify-between text-xs text-fg-subtle">
          <dt>{t("cart.vatIncluded", { rate: (vatBps / 100).toFixed(0) })}</dt>
          <dd className="tabular">{price(vatFromGross(total, vatBps))}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 font-semibold">
          <dt>{t("product.estimatedTotal")}</dt>
          <dd className="tabular">{price(total)}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" variant="outline" onClick={() => add(false)} loading={busy === "cart"} disabled={!available}>
          {t("product.addToCart")}
        </Button>
        <Button size="lg" onClick={() => add(true)} loading={busy === "buy"} disabled={!available}>
          {t("product.buyNow")}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => toggleWishlist(props.productId)} aria-pressed={wished}>
          <Heart className={cn("h-4 w-4", wished && "fill-berry-600 text-berry-600")} /> {wished ? t("wishlist.saved") : t("wishlist.add")}
        </Button>
        <Button variant="ghost" size="sm" onClick={share}>
          <Share2 className="h-4 w-4" /> {t("product.share")}
        </Button>
      </div>

      <div className="space-y-3 rounded-2xl border border-line p-4 text-sm">
        <p className="flex items-start gap-3">
          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <span>
            <span className="font-semibold">{t("product.estimatedDelivery", { from: eta(props.deliveryDaysMin), to: eta(props.deliveryDaysMax) })}</span>
            <span className="block text-xs text-fg-muted">
              {props.freeShipping ? t("product.freeShipping") : threshold ? t("product.freeShippingOver", { amount: price(threshold) }) : t("product.shippingFrom", { amount: price(props.shippingCost) })}
            </span>
          </span>
        </p>
        <p className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <span>
            <span className="font-semibold">{t("product.buyerProtection")}</span>
            <span className="block text-xs text-fg-muted">{t("product.buyerProtectionText")}</span>
          </span>
        </p>
      </div>
    </div>
  );
}
