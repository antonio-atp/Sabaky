"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User, Zap } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";
import { cn } from "@/lib/utils";

/** Thumb-reachable bottom navigation on phones (hidden ≥ md). */
export function MobileNav() {
  const { t } = useI18n();
  const { cartCount, user } = useShop();
  const path = usePathname();
  const items = [
    { href: "/", label: t("nav.home"), icon: Home, match: (p: string) => p === "/" },
    { href: "/categories", label: t("nav.categories"), icon: LayoutGrid, match: (p: string) => p.startsWith("/categories") || p.startsWith("/c/") },
    { href: "/deals", label: t("nav.deals"), icon: Zap, match: (p: string) => p.startsWith("/deals") },
    { href: "/cart", label: t("nav.cart"), icon: ShoppingCart, match: (p: string) => p.startsWith("/cart"), badge: cartCount },
    { href: user ? "/account" : "/login", label: user ? t("nav.account") : t("nav.signIn"), icon: User, match: (p: string) => p.startsWith("/account") || p.startsWith("/login") },
  ];
  return (
    <nav
      aria-label={t("nav.mobile")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match(path);
          return (
            <li key={item.href}>
              <Link href={item.href} className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-brand-700" : "text-fg-muted")} aria-current={active ? "page" : undefined}>
                <span className="relative">
                  <item.icon className="h-5.5 w-5.5" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                  {!!item.badge && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-sunrise-400 px-1 text-[10px] font-bold text-ink-950">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
