"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bookmark, Lock, Minus, Plus, ShoppingBag, Store, Tag, Trash2, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/api-client";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { OrderSummary } from "./order-summary";
import type { CartDTO, CartLineDTO } from "@/shared/types";
import { cn } from "@/lib/utils";

export function CartView({ initial }: { initial: CartDTO }) {
  const { t, price } = useI18n();
  const { refreshCartCount, user } = useShop();
  const toast = useToast();
  const router = useRouter();
  const [cart, setCart] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  async function mutate(lineId: string, fn: () => Promise<CartDTO>) {
    setBusyLine(lineId);
    try {
      const next = await fn();
      startTransition(() => setCart(next));
      await refreshCartCount();
    } catch (e) {
      toast("error", e instanceof ApiClientError ? e.message : "errors.INTERNAL");
    } finally {
      setBusyLine(null);
    }
  }

  const update = (line: CartLineDTO, patch: Record<string, unknown>) => mutate(line.id, () => api<CartDTO>(`/cart/items/${line.id}`, { method: "PATCH", body: patch }));
  const remove = (line: CartLineDTO) => mutate(line.id, () => api<CartDTO>(`/cart/items/${line.id}`, { method: "DELETE" }));

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!coupon.trim()) return;
    setCouponBusy(true);
    try {
      setCart(await api<CartDTO>("/cart/coupon", { body: { code: coupon } }));
      setCoupon("");
      toast("success", "cart.couponApplied");
    } catch (err) {
      toast("error", err instanceof ApiClientError ? err.message : "errors.INTERNAL");
    } finally {
      setCouponBusy(false);
    }
  }

  async function removeCoupon() {
    setCart(await api<CartDTO>("/cart/coupon", { method: "DELETE" }));
  }

  const hasIssues = cart.lines.some((l) => l.issue);
  const checkoutHref = user ? "/checkout" : "/login?next=/checkout";

  if (!cart.lines.length && !cart.saved.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" />}
        title={t("cart.empty")}
        description={t("cart.emptyHint")}
        action={<ButtonLink href="/">{t("cart.continueShopping")}</ButtonLink>}
      />
    );
  }

  const groups = cart.groups.length
    ? cart.groups.map((g) => ({ ...g, lines: cart.lines.filter((l) => l.seller.id === g.sellerId) }))
    : [];
  const ungrouped = cart.lines.filter((l) => !cart.groups.some((g) => g.sellerId === l.seller.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className={cn("space-y-4", pending && "opacity-80")}>
        {cart.lines.length === 0 && <EmptyState title={t("cart.empty")} description={t("cart.onlySaved")} />}
        {groups.map((g) => (
          <section key={g.sellerId} className="card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted/60 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Store className="h-4 w-4 text-fg-muted" aria-hidden />
                {g.sellerName}
              </p>
              <p className="text-xs text-fg-muted">
                {g.shipping === 0 ? t("cart.freeShippingFromSeller") : t("cart.shippingFromSeller", { amount: price(g.shipping) })} · {t("cart.arrivesIn", { min: g.deliveryDaysMin, max: g.deliveryDaysMax })}
              </p>
            </header>
            <ul className="divide-y divide-line">
              {g.lines.map((line) => (
                <CartLine key={line.id} line={line} busy={busyLine === line.id} onUpdate={update} onRemove={remove} />
              ))}
            </ul>
          </section>
        ))}
        {ungrouped.length > 0 && (
          <section className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {ungrouped.map((line) => (
                <CartLine key={line.id} line={line} busy={busyLine === line.id} onUpdate={update} onRemove={remove} />
              ))}
            </ul>
          </section>
        )}

        {cart.saved.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">{t("cart.savedForLater", { count: cart.saved.length })}</h2>
            <ul className="divide-y divide-line">
              {cart.saved.map((line) => (
                <li key={line.id} className="flex items-center gap-3 p-4">
                  <LineImage line={line} size={56} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/p/${line.productSlug}`} className="line-clamp-1 text-sm hover:text-brand-700">
                      {line.title}
                    </Link>
                    <p className="text-sm font-semibold tabular">{price(line.unitPrice)}</p>
                  </div>
                  <Button size="sm" variant="secondary" loading={busyLine === line.id} onClick={() => update(line, { savedForLater: false })}>
                    {t("cart.moveToCart")}
                  </Button>
                  <button onClick={() => remove(line)} className="rounded-lg p-2 text-fg-subtle hover:text-berry-600" aria-label={t("common.remove")}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {cart.lines.length > 0 && (
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card space-y-5 p-5">
            <h2 className="text-base font-bold">{t("cart.summary")}</h2>
            {cart.coupon ? (
              <div className={cn("flex items-center justify-between rounded-xl px-3 py-2 text-sm", cart.coupon.applied ? "bg-brand-50 text-brand-800" : "bg-sunrise-50 text-sunrise-600")}>
                <span className="flex items-center gap-2 font-semibold">
                  <Tag className="h-4 w-4" aria-hidden /> {cart.coupon.code}
                  {!cart.coupon.applied && <span className="text-xs font-normal">· {t(`cart.couponReason.${cart.coupon.reason ?? "invalid"}`)}</span>}
                </span>
                <button onClick={removeCoupon} aria-label={t("common.remove")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={applyCoupon} className="flex gap-2">
                <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={t("cart.couponPlaceholder")} aria-label={t("cart.couponPlaceholder")} maxLength={32} className="h-10 uppercase" />
                <Button type="submit" variant="outline" loading={couponBusy}>
                  {t("cart.apply")}
                </Button>
              </form>
            )}
            <OrderSummary totals={cart.totals} itemCount={cart.itemCount} shippingLabel={t("cart.shippingEstimate")} />
            {hasIssues && (
              <p className="flex gap-2 rounded-xl bg-sunrise-50 p-3 text-xs text-sunrise-600">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {t("cart.fixIssues")}
              </p>
            )}
            <Button size="lg" className="w-full" disabled={hasIssues} onClick={() => router.push(checkoutHref)}>
              <Lock className="h-4 w-4" /> {t("cart.checkout")}
            </Button>
            <Link href="/" className="block text-center text-sm font-medium text-brand-700 hover:underline">
              {t("cart.continueShopping")}
            </Link>
          </div>
        </aside>
      )}

      {cart.lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
          <div>
            <p className="text-xs text-fg-muted">{t("cart.total")}</p>
            <p className="text-lg font-bold tabular">{price(cart.totals.total)}</p>
          </div>
          <Button size="lg" disabled={hasIssues} onClick={() => router.push(checkoutHref)}>
            {t("cart.checkout")} ({cart.itemCount})
          </Button>
        </div>
      )}
    </div>
  );
}

function LineImage({ line, size }: { line: CartLineDTO; size: number }) {
  return (
    <Link href={`/p/${line.productSlug}`} className="relative shrink-0 overflow-hidden rounded-xl bg-surface-sunken" style={{ width: size, height: size }}>
      {line.image && <Image src={line.image.url} alt={line.image.alt} fill sizes={`${size}px`} className="object-cover" />}
    </Link>
  );
}

function CartLine({
  line,
  busy,
  onUpdate,
  onRemove,
}: {
  line: CartLineDTO;
  busy: boolean;
  onUpdate: (line: CartLineDTO, patch: Record<string, unknown>) => void;
  onRemove: (line: CartLineDTO) => void;
}) {
  const { t, price } = useI18n();
  const max = Math.min(99, line.available);
  return (
    <li className={cn("flex gap-3 p-4 sm:gap-4", busy && "pointer-events-none opacity-60")}>
      <LineImage line={line} size={88} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-between gap-3">
          <Link href={`/p/${line.productSlug}`} className="line-clamp-2 text-sm leading-5 hover:text-brand-700">
            {line.title}
          </Link>
          <div className="text-right">
            <p className="text-sm font-bold tabular">{price(line.lineTotal)}</p>
            {line.quantity > 1 && <p className="text-xs text-fg-subtle tabular">{t("cart.each", { price: price(line.unitPrice) })}</p>}
            {line.compareAtPrice && line.compareAtPrice > line.unitPrice && <p className="text-xs text-fg-subtle line-through tabular">{price(line.compareAtPrice * line.quantity)}</p>}
          </div>
        </div>
        {line.variants.length > 1 ? (
          <select
            value={line.variantId}
            onChange={(e) => onUpdate(line, { variantId: e.target.value })}
            aria-label={t("cart.variant")}
            className="h-8 max-w-full rounded-lg border border-line-strong bg-surface px-2 text-xs"
          >
            {line.variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.available === 0}>
                {v.name}
                {v.available === 0 ? ` — ${t("product.outOfStock")}` : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-fg-muted">{line.variantName}</p>
        )}
        {line.issue && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-sunrise-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {t(`cart.issue.${line.issue}`, { count: line.available })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center rounded-lg border border-line-strong">
            <button onClick={() => onUpdate(line, { quantity: line.quantity - 1 })} disabled={line.quantity <= 1} className="grid h-full w-8 place-items-center disabled:opacity-40" aria-label={t("cart.decrease")}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-semibold tabular">{line.quantity}</span>
            <button onClick={() => onUpdate(line, { quantity: line.quantity + 1 })} disabled={line.quantity >= max} className="grid h-full w-8 place-items-center disabled:opacity-40" aria-label={t("cart.increase")}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={() => onUpdate(line, { savedForLater: true })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg">
            <Bookmark className="h-3.5 w-3.5" aria-hidden /> {t("cart.saveForLater")}
          </button>
          <button onClick={() => onRemove(line)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-fg-muted hover:bg-berry-50 hover:text-berry-600">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t("common.remove")}
          </button>
        </div>
      </div>
    </li>
  );
}
