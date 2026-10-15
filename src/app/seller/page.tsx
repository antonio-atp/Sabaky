import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Boxes, Clock, Coins, Euro, MessageCircleQuestion, Package, ShoppingBag, Users } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { sellerDashboard } from "@/server/services/seller";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { PageHeader } from "@/components/dashboard/data-table";
import { Badge, StatCard } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.center"), robots: { index: false } };
}

export default async function SellerOverview() {
  const { seller } = await requireSellerPage("/seller");
  const { t, price, number, date } = await getI18n();
  const stats = await sellerDashboard(seller.id, 30);
  const verification = seller.verifications[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={seller.storeName}
        subtitle={t("seller.last30")}
        action={
          <ButtonLink href="/seller/products/new">
            <Package className="h-4 w-4" /> {t("seller.addProduct")}
          </ButtonLink>
        }
      />

      {seller.status !== "VERIFIED" && (
        <div className={`flex gap-3 rounded-2xl p-4 text-sm ${seller.status === "PENDING" ? "bg-sunrise-50 text-sunrise-600" : "bg-berry-50 text-berry-700"}`}>
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t(`seller.status.${seller.status}`)}</p>
            <p className="mt-0.5 text-fg-muted">{t(`seller.statusHint.${seller.status}`)}</p>
            {verification?.reviewNotes && <p className="mt-1 text-xs">{verification.reviewNotes}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("seller.stats.sales")} value={price(stats.sales)} icon={<Euro className="h-5 w-5" />} hint={t("seller.stats.units", { count: stats.units })} />
        <StatCard label={t("seller.stats.revenue")} value={price(stats.revenue)} icon={<Coins className="h-5 w-5" />} hint={t("seller.stats.afterCommission", { amount: price(stats.commission) })} />
        <StatCard label={t("seller.stats.orders")} value={number(stats.orders)} icon={<ShoppingBag className="h-5 w-5" />} />
        <StatCard label={t("seller.stats.customers")} value={number(stats.customers)} icon={<Users className="h-5 w-5" />} />
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold">{t("seller.salesTrend")}</h2>
        <TrendChart data={stats.series} label={t("seller.salesTrend")} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/seller/orders?status=to_ship" className="card flex items-center gap-4 p-5 hover:ring-2 hover:ring-brand-500/20">
          <Clock className="h-8 w-8 text-sunrise-500" aria-hidden />
          <div>
            <p className="text-2xl font-bold tabular">{stats.toShip}</p>
            <p className="text-sm text-fg-muted">{t("seller.toShip")}</p>
          </div>
        </Link>
        <Link href="/seller/questions" className="card flex items-center gap-4 p-5 hover:ring-2 hover:ring-brand-500/20">
          <MessageCircleQuestion className="h-8 w-8 text-brand-600" aria-hidden />
          <div>
            <p className="text-2xl font-bold tabular">{stats.openQuestions}</p>
            <p className="text-sm text-fg-muted">{t("seller.openQuestions")}</p>
          </div>
        </Link>
        <Link href="/seller/products" className="card flex items-center gap-4 p-5 hover:ring-2 hover:ring-brand-500/20">
          <Boxes className="h-8 w-8 text-ink-800" aria-hidden />
          <div>
            <p className="text-2xl font-bold tabular">{stats.productCount}</p>
            <p className="text-sm text-fg-muted">{t("seller.nav.products")}</p>
          </div>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-base font-bold">{t("seller.topProducts")}</h2>
          {stats.topProducts.length ? (
            <ol className="space-y-2 text-sm">
              {stats.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="w-5 text-fg-subtle tabular">{i + 1}.</span>
                  <span className="line-clamp-1 flex-1">{p.title}</span>
                  <span className="text-xs text-fg-muted tabular">{t("seller.stats.units", { count: p.units })}</span>
                  <span className="w-24 text-right font-semibold tabular">{price(p.sales)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-fg-muted">{t("seller.noSalesYet")}</p>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-base font-bold">{t("seller.lowStock")}</h2>
          {stats.lowStock.length ? (
            <ul className="space-y-2 text-sm">
              {stats.lowStock.map((l) => (
                <li key={l.variant.id} className="flex items-center gap-3">
                  <Link href={`/seller/products/${l.variant.product.id}/edit`} className="line-clamp-1 flex-1 hover:text-brand-700">
                    {l.variant.product.title} <span className="text-fg-subtle">· {l.variant.name}</span>
                  </Link>
                  <Badge tone={l.quantity === 0 ? "danger" : "warning"}>{t("seller.unitsLeft", { count: l.quantity })}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">{t("seller.stockHealthy")}</p>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{t("seller.recentOrders")}</h2>
          <Link href="/seller/orders" className="text-sm font-semibold text-brand-700 hover:underline">
            {t("common.seeAll")}
          </Link>
        </div>
        {stats.recent.length ? (
          <ul className="divide-y divide-line text-sm">
            {stats.recent.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="font-mono font-semibold">{s.order.number}</span>
                <span className="text-fg-muted">{date(s.order.placedAt)}</span>
                <Badge>{t(`shipmentStatus.${s.status}`)}</Badge>
                <span className="ml-auto font-semibold tabular">{price(s.items.reduce((sum, i) => sum + i.lineTotal, 0))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">{t("seller.noOrdersYet")}</p>
        )}
      </section>
    </div>
  );
}
