import type { Metadata } from "next";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { listSellerShipments } from "@/server/services/seller";
import { FilterTabs, PageHeader } from "@/components/dashboard/data-table";
import { ShipmentUpdater } from "@/components/seller/shipment-updater";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { qs } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.nav.orders"), robots: { index: false } };
}

const FILTERS = ["to_ship", "in_transit", "delivered"] as const;

export default async function SellerOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { seller } = await requireSellerPage("/seller/orders");
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as (typeof FILTERS)[number]) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, price, date } = await getI18n();
  const shipments = await listSellerShipments(seller.id, status, page);

  return (
    <div>
      <PageHeader title={t("seller.nav.orders")} subtitle={t("seller.ordersHint")} />
      <FilterTabs
        active={status ?? "all"}
        items={[{ key: "all", label: t("common.all"), href: "/seller/orders" }, ...FILTERS.map((f) => ({ key: f, label: t(`seller.orderFilter.${f}`), href: `/seller/orders?status=${f}` }))]}
      />
      {shipments.items.length ? (
        <ul className="space-y-3">
          {shipments.items.map((s) => {
            const addr = s.order.shippingAddress as Record<string, string | null>;
            const net = s.items.reduce((sum, i) => sum + i.lineTotal - i.discount, 0);
            return (
              <li key={s.id} className="card overflow-hidden">
                <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-surface-muted/60 px-4 py-3 text-sm">
                  <span className="font-mono font-semibold">{s.order.number}</span>
                  <span className="text-fg-muted">{date(s.order.placedAt, { dateStyle: "medium", timeStyle: "short" })}</span>
                  <Badge tone={s.status === "DELIVERED" ? "success" : s.status === "PENDING" ? "warning" : "brand"}>{t(`shipmentStatus.${s.status}`)}</Badge>
                  <span className="text-xs text-fg-muted">{t(`checkout.delivery.${s.order.deliveryMethod}`)}</span>
                  <span className="ml-auto font-semibold tabular">{price(net)}</span>
                </header>
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_240px]">
                  <ul className="space-y-2">
                    {s.items.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 text-sm">
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                          {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1">{i.title}</span>
                          <span className="text-xs text-fg-subtle">
                            {i.variantName} · × {i.quantity}
                            {i.status !== "ACTIVE" && ` · ${t(`itemStatus.${i.status}`)}`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <address className="rounded-xl bg-surface-muted p-3 text-xs not-italic leading-relaxed text-fg-muted">
                    <span className="font-semibold text-fg">{addr.fullName}</span>
                    <br />
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}
                    <br />
                    {addr.postalCode} {addr.city} · {addr.countryCode}
                  </address>
                </div>
                {s.order.status !== "CANCELLED" && s.order.status !== "REFUNDED" && (
                  <div className="border-t border-line p-4">
                    {s.trackingNumber && (
                      <p className="mb-2 text-xs text-fg-muted">
                        {s.carrier} · <span className="font-mono">{s.trackingNumber}</span>
                      </p>
                    )}
                    <ShipmentUpdater id={s.id} status={s.status} carrier={s.carrier} trackingNumber={s.trackingNumber} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title={t("seller.noOrdersYet")} />
      )}
      <div className="mt-5">
        <Pagination page={page} pageCount={shipments.pageCount} hrefFor={(p) => `/seller/orders${qs({ status, page: p })}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
      </div>
    </div>
  );
}
