"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, LayoutDashboard, MapPin, Package, ShieldCheck, Star, UserCog } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function AccountNav() {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/account", label: t("account.nav.overview"), icon: LayoutDashboard, exact: true },
    { href: "/account/orders", label: t("account.nav.orders"), icon: Package },
    { href: "/account/addresses", label: t("account.nav.addresses"), icon: MapPin },
    { href: "/account/payment-methods", label: t("account.nav.payments"), icon: CreditCard },
    { href: "/account/reviews", label: t("account.nav.reviews"), icon: Star },
    { href: "/account/notifications", label: t("account.nav.notifications"), icon: Bell },
    { href: "/account/settings", label: t("account.nav.settings"), icon: UserCog },
    { href: "/account/privacy", label: t("account.nav.privacy"), icon: ShieldCheck },
  ];
  return (
    <nav aria-label={t("nav.account")} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {items.map((item) => {
        const active = item.exact ? path === item.href : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-brand-600 text-white" : "text-fg-muted hover:bg-surface hover:text-fg",
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
