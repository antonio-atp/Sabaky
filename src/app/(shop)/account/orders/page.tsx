import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { listOrders } from "@/server/services/orders";
import { OrderStatusBadge } from "@/components/account/order-status";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.orders"), robots: { index: false } };
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser("/account/orders");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { t, price, date } = await getI18n();
  const orders = await listOrders(user.id, page);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.orders")}</h1>
      {orders.items.length ? (
        <>
          <ul className="space-y-3">
            {orders.items.map((o) => (
              <li key={o.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted/60 px-4 py-3 text-xs text-fg-muted">
                  <span>
                    {t("account.orderPlaced")} <span className="font-semibold text-fg">{date(o.placedAt)}</span>
                  </span>
                  <span>
                    {t("cart.total")} <span className="font-semibold text-fg tabular">{price(o.total)}</span>
                  </span>
                  <span className="font-mono font-semibold text-fg">{o.number}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex -space-x-3">
                    {o.items.map((i) => (
                      <span key={i.id} className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-surface bg-surface-sunken">
                        {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <OrderStatusBadge status={o.status} />
                    <p className="mt-1 line-clamp-1 text-sm">{o.items.map((i) => i.title).join(" · ")}</p>
                    {o.estimatedDeliveryAt && !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status) && (
                      <p className="text-xs text-fg-muted">{t("account.eta", { date: date(o.estimatedDeliveryAt, { weekday: "short", day: "numeric", month: "short" }) })}</p>
                    )}
                  </div>
                  <ButtonLink href={`/account/orders/${o.number}`} variant="outline" size="sm">
                    {t("account.trackOrder")}
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageCount={orders.pageCount} hrefFor={(p) => `/account/orders?page=${p}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
        </>
      ) : (
        <EmptyState icon={<Package className="h-6 w-6" />} title={t("account.noOrders")} description={t("account.noOrdersHint")} action={<ButtonLink href="/">{t("home.shopNow")}</ButtonLink>} />
      )}
      <p className="text-xs text-fg-subtle">
        {t("account.ordersHelp")}{" "}
        <Link href="/legal/help" className="font-medium text-brand-700 hover:underline">
          {t("nav.help")}
        </Link>
      </p>
    </div>
  );
}
