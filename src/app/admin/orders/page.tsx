import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { listOrdersAdmin } from "@/server/services/admin";
import { DataTable, FilterTabs, PageHeader, Td } from "@/components/dashboard/data-table";
import { Badge } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { qs } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.orders"), robots: { index: false } };
}

const STATUSES = ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, price, date } = await getI18n();
  const orders = await listOrdersAdmin({ status, q: sp.q?.slice(0, 80), page });

  return (
    <div>
      <PageHeader title={t("admin.nav.orders")} subtitle={t("admin.totalCount", { count: orders.total })} />
      <form className="mb-3">
        <input name="q" defaultValue={sp.q} placeholder={t("admin.searchOrders")} className="h-10 w-full max-w-sm rounded-xl border border-line-strong bg-surface px-3.5 text-sm" />
      </form>
      <FilterTabs active={status ?? "all"} items={[{ key: "all", label: t("common.all"), href: "/admin/orders" }, ...STATUSES.map((s) => ({ key: s, label: t(`orderStatus.${s}`), href: `/admin/orders?status=${s}` }))]} />
      <DataTable head={[t("admin.table.order"), t("admin.table.customer"), t("admin.table.status"), t("admin.table.payment"), t("admin.table.risk"), t("cart.total"), t("admin.table.placed")]}>
        {orders.items.map((o) => (
          <tr key={o.id}>
            <Td className="font-mono text-xs font-semibold">{o.number}</Td>
            <Td className="text-xs">{o.email}</Td>
            <Td>
              <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" || o.status === "REFUNDED" ? "neutral" : "brand"}>{t(`orderStatus.${o.status}`)}</Badge>
            </Td>
            <Td className="text-xs">
              {o.payments[0] ? (
                <>
                  {t(`checkout.payment.${o.payments[0].method}`)} · <span className={o.payments[0].status === "FAILED" ? "text-berry-600" : ""}>{t(`paymentStatus.${o.payments[0].status}`)}</span>
                </>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              <Badge tone={o.riskScore >= 60 ? "danger" : o.riskScore >= 30 ? "warning" : "neutral"}>{o.riskScore}</Badge>
            </Td>
            <Td className="font-semibold tabular">{price(o.total)}</Td>
            <Td className="text-xs text-fg-muted">{date(o.placedAt, { dateStyle: "medium", timeStyle: "short" })}</Td>
          </tr>
        ))}
      </DataTable>
      <div className="mt-5">
        <Pagination page={page} pageCount={orders.pageCount} hrefFor={(p) => `/admin/orders${qs({ status, q: sp.q, page: p })}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
      </div>
    </div>
  );
}
