import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Bell, Heart, Package, Store } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { listOrders } from "@/server/services/orders";
import { unreadCount } from "@/server/services/notifications";
import { wishlistProductIds } from "@/server/services/wishlist";
import { OrderStatusBadge } from "@/components/account/order-status";
import { ResendVerification } from "@/components/account/resend-verification";
import { EmptyState, StatCard } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.overview"), robots: { index: false } };
}

export default async function AccountOverview() {
  const user = await requireUser("/account");
  const { t, price, date } = await getI18n();
  const [orders, unread, wishlist] = await Promise.all([listOrders(user.id, 1, 5), unreadCount(user.id), wishlistProductIds(user.id)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("account.hello", { name: user.name.split(" ")[0] })}</h1>
        <p className="text-sm text-fg-muted">{user.email}</p>
      </div>
      {!user.emailVerified && <ResendVerification />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/account/orders">
          <StatCard label={t("account.nav.orders")} value={orders.total} icon={<Package className="h-5 w-5" />} />
        </Link>
        <Link href="/wishlist">
          <StatCard label={t("nav.wishlist")} value={wishlist.length} icon={<Heart className="h-5 w-5" />} />
        </Link>
        <Link href="/account/notifications">
          <StatCard label={t("account.unread")} value={unread} icon={<Bell className="h-5 w-5" />} />
        </Link>
        <Link href={user.sellerId ? "/seller" : "/seller/register"}>
          <StatCard label={user.sellerId ? t("nav.sellerDashboard") : t("nav.sell")} value={user.sellerId ? "→" : "+"} icon={<Store className="h-5 w-5" />} />
        </Link>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{t("account.recentOrders")}</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:underline">
            {t("common.seeAll")}
          </Link>
        </div>
        {orders.items.length ? (
          <ul className="divide-y divide-line">
            {orders.items.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.number}`} className="flex items-center gap-4 py-3 hover:bg-surface-muted/50">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((i) => (
                      <span key={i.id} className="relative h-12 w-12 overflow-hidden rounded-xl border-2 border-surface bg-surface-sunken">
                        {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">{o.number}</p>
                    <p className="text-xs text-fg-muted">
                      {date(o.placedAt)} · {t("account.itemCount", { count: o._count.items })}
                    </p>
                  </div>
                  <div className="text-right">
                    <OrderStatusBadge status={o.status} />
                    <p className="mt-1 text-sm font-semibold tabular">{price(o.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Package className="h-6 w-6" />} title={t("account.noOrders")} action={<ButtonLink href="/">{t("home.shopNow")}</ButtonLink>} />
        )}
      </section>
    </div>
  );
}
