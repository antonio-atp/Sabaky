import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Coins, Package, Percent, Receipt, RotateCcw, ShieldAlert, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { platformAnalytics } from "@/server/services/admin";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { PageHeader } from "@/components/dashboard/data-table";
import { StatCard } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.console"), robots: { index: false } };
}

const RANGES = [7, 30, 90] as const;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const d = Number((await searchParams).days);
  const days = RANGES.includes(d as (typeof RANGES)[number]) ? d : 30;
  const { t, price, number } = await getI18n();
  const a = await platformAnalytics(days);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.nav.analytics")}
        subtitle={t("admin.lastDays", { days })}
        action={
          <div className="flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-line" role="group" aria-label={t("admin.range")}>
            {RANGES.map((r) => (
              <Link key={r} href={`/admin?days=${r}`} aria-current={r === days ? "true" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${r === days ? "bg-ink-900 text-white" : "text-fg-muted hover:text-fg"}`}>
                {r}d
              </Link>
            ))}
          </div>
        }
      />

      {(a.pendingSellers > 0 || a.openRisk > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {a.pendingSellers > 0 && (
            <Link href="/admin/sellers?status=PENDING" className="flex items-center gap-3 rounded-2xl bg-sunrise-50 p-4 text-sm font-medium text-sunrise-600 ring-1 ring-sunrise-100">
              <BadgeCheck className="h-5 w-5" aria-hidden /> {t("admin.pendingSellers", { count: a.pendingSellers })}
            </Link>
          )}
          {a.openRisk > 0 && (
            <Link href="/admin/risk" className="flex items-center gap-3 rounded-2xl bg-berry-50 p-4 text-sm font-medium text-berry-700 ring-1 ring-berry-100">
              <ShieldAlert className="h-5 w-5" aria-hidden /> {t("admin.openRisk", { count: a.openRisk })}
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("admin.kpi.totalSales")} value={price(a.totalSales)} icon={<TrendingUp className="h-5 w-5" />} hint={t("admin.kpi.gmvHint")} />
        <StatCard label={t("admin.kpi.revenue")} value={price(a.revenue)} icon={<Coins className="h-5 w-5" />} hint={t("admin.kpi.revenueHint")} />
        <StatCard label={t("admin.kpi.orders")} value={number(a.orders)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label={t("admin.kpi.aov")} value={price(a.averageOrderValue)} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label={t("admin.kpi.customers")} value={number(a.customers)} icon={<Users className="h-5 w-5" />} />
        <StatCard label={t("admin.kpi.sellers")} value={number(a.sellers)} icon={<Store className="h-5 w-5" />} />
        <StatCard label={t("admin.kpi.products")} value={number(a.products)} icon={<Package className="h-5 w-5" />} />
        <StatCard label={t("admin.kpi.conversion")} value={pct(a.conversionRate)} icon={<Percent className="h-5 w-5" />} hint={t("admin.kpi.conversionHint")} />
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">{t("admin.salesTrend")}</h2>
          <p className="flex items-center gap-1.5 text-sm text-fg-muted">
            <RotateCcw className="h-4 w-4" aria-hidden /> {t("admin.kpi.refundRate")}: <span className="font-semibold text-fg tabular">{pct(a.refundRate)}</span>
          </p>
        </div>
        <TrendChart data={a.series} label={t("admin.salesTrend")} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold">{t("admin.topSellers")}</h2>
        {a.topSellers.length ? (
          <ol className="space-y-2.5 text-sm">
            {a.topSellers.map((s, i) => {
              const max = a.topSellers[0].sales || 1;
              return (
                <li key={s.sellerId} className="grid grid-cols-[1.5rem_10rem_1fr_6rem] items-center gap-3">
                  <span className="text-fg-subtle tabular">{i + 1}</span>
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(s.sales / max) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular">{price(s.sales)}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-fg-muted">{t("admin.noData")}</p>
        )}
      </section>
    </div>
  );
}
