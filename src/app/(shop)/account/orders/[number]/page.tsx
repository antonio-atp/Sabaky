import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Store, Truck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getOrderForUser } from "@/server/services/orders";
import { OrderStatusBadge, OrderTimeline } from "@/components/account/order-status";
import { CancelOrderButton, DisputeButton, ReturnItemButton } from "@/components/account/order-actions";
import { Breadcrumbs } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).number, robots: { index: false } };
}

export default async function OrderDetailPage({ params }: Props) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const order = await getOrderForUser(user.id, number);
  if (!order) notFound();
  const { t, price, date } = await getI18n();
  const address = order.shippingAddress as Record<string, string | null>;
  const payment = order.payments[0];

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("account.nav.orders"), href: "/account/orders" }, { label: order.number }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold">{order.number}</h1>
          <p className="text-sm text-fg-muted">
            {t("account.orderPlaced")} {date(order.placedAt, { dateStyle: "long" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.canCancel && <CancelOrderButton number={order.number} />}
          <DisputeButton number={order.number} />
        </div>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">{t("orders.tracking")}</h2>
            <OrderStatusBadge status={order.status} />
          </div>
          {order.estimatedDeliveryAt && !["CANCELLED", "REFUNDED", "DELIVERED"].includes(order.status) && (
            <p className="text-sm text-fg-muted">{t("account.eta", { date: date(order.estimatedDeliveryAt, { weekday: "long", day: "numeric", month: "long" }) })}</p>
          )}
        </div>
        <OrderTimeline status={order.status} events={order.events.map((e) => ({ status: e.status, createdAt: e.createdAt.toISOString() }))} />
      </section>

      {order.shipments.map((s) => (
        <section key={s.id} className="card overflow-hidden">
          <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line bg-surface-muted/60 px-5 py-3 text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <Store className="h-4 w-4 text-fg-muted" aria-hidden /> {s.seller.storeName}
            </span>
            <span className="flex items-center gap-1.5 text-fg-muted">
              <Truck className="h-4 w-4" aria-hidden />
              {s.carrier ?? t("orders.carrierPending")}
              {s.trackingNumber && <span className="font-mono text-fg">· {s.trackingNumber}</span>}
            </span>
            <Badge tone={s.status === "DELIVERED" ? "success" : "neutral"}>{t(`shipmentStatus.${s.status}`)}</Badge>
          </header>
          <ul className="divide-y divide-line">
            {order.items
              .filter((i) => i.shipmentId === s.id)
              .map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <Link href={`/p/${item.product.slug}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/p/${item.product.slug}`} className="line-clamp-1 text-sm font-medium hover:text-brand-700">
                      {item.title}
                    </Link>
                    <p className="text-xs text-fg-muted">
                      {item.variantName} · × {item.quantity} · {price(item.unitPrice)}
                    </p>
                    {item.status !== "ACTIVE" && <Badge tone="warning" className="mt-1">{t(`itemStatus.${item.status}`)}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === "DELIVERED" && !item.review && (
                      <ButtonLink href={`/p/${item.product.slug}#reviews`} size="sm" variant="secondary">
                        {t("reviews.write")}
                      </ButtonLink>
                    )}
                    {order.canReturn && item.status === "ACTIVE" && <ReturnItemButton number={order.number} item={{ id: item.id, title: item.title, quantity: item.quantity }} />}
                  </div>
                  <p className="w-full text-right text-sm font-semibold tabular sm:w-auto">{price(item.lineTotal)}</p>
                </li>
              ))}
          </ul>
          {s.events.length > 0 && (
            <details className="border-t border-line px-5 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-brand-700">{t("orders.shipmentHistory")}</summary>
              <ol className="mt-3 space-y-2 border-l-2 border-line pl-4">
                {s.events.map((e) => (
                  <li key={e.id}>
                    <p className="font-medium">{t(`shipmentStatus.${e.status}`)}</p>
                    <p className="text-xs text-fg-muted">
                      {date(e.occurredAt, { dateStyle: "medium", timeStyle: "short" })}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>
      ))}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5 text-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <MapPin className="h-4 w-4 text-brand-600" aria-hidden /> {t("orders.shippingTo")}
          </h2>
          <address className="not-italic leading-relaxed text-fg-muted">
            {address.fullName}
            <br />
            {address.line1}
            {address.line2 ? <>, {address.line2}</> : null}
            <br />
            {address.postalCode} {address.city}
            {address.region ? `, ${address.region}` : ""}
            <br />
            {address.countryCode}
          </address>
          <p className="mt-3 text-xs text-fg-subtle">
            {t(`checkout.delivery.${order.deliveryMethod}`)} · {payment ? t(`checkout.payment.${payment.method}`) : ""} {payment && `(${t(`paymentStatus.${payment.status}`)})`}
          </p>
        </section>
        <section className="card p-5 text-sm">
          <h2 className="mb-3 text-base font-bold">{t("orders.paymentSummary")}</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-fg-muted">{t("cart.subtotal", { count: order.items.reduce((s, i) => s + i.quantity, 0) })}</dt>
              <dd className="tabular">{price(order.subtotal)}</dd>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-berry-600">
                <dt>{t("cart.discount")}</dt>
                <dd className="tabular">−{price(order.discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-fg-muted">{t("cart.shipping")}</dt>
              <dd className="tabular">{order.shippingTotal === 0 ? t("cart.free") : price(order.shippingTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-bold">
              <dt>{t("cart.total")}</dt>
              <dd className="tabular">{price(order.total)}</dd>
            </div>
            <div className="flex justify-between text-xs text-fg-subtle">
              <dt>{t("orders.vatIncluded")}</dt>
              <dd className="tabular">{price(order.taxTotal)}</dd>
            </div>
          </dl>
          {order.refunds.length > 0 && (
            <div className="mt-4 space-y-1 border-t border-line pt-3">
              {order.refunds.map((r) => (
                <p key={r.id} className="flex justify-between text-xs">
                  <span>
                    {t("orders.refund")} · {t(`refundStatus.${r.status}`)}
                  </span>
                  <span className="tabular">{price(r.amount)}</span>
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
