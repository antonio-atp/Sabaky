"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Heart, LayoutDashboard, LogOut, Package, Shield, Store, User } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/utils";

export function UserMenu() {
  const { t } = useI18n();
  const { user, unreadNotifications } = useShop();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <Link href="/login" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-surface-sunken">
        <User className="h-5.5 w-5.5 text-fg" aria-hidden />
        <span className="hidden flex-col leading-tight lg:flex">
          <span className="text-[11px] text-fg-subtle">{t("nav.hello")}</span>
          <span className="text-sm font-semibold text-fg">{t("nav.signIn")}</span>
        </span>
      </Link>
    );
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  const items = [
    { href: "/account", label: t("account.nav.overview"), icon: User },
    { href: "/account/orders", label: t("account.nav.orders"), icon: Package },
    { href: "/wishlist", label: t("nav.wishlist"), icon: Heart },
    { href: "/account/notifications", label: t("account.nav.notifications"), icon: Bell, badge: unreadNotifications },
    user.isSeller
      ? { href: "/seller", label: t("nav.sellerDashboard"), icon: LayoutDashboard }
      : { href: "/seller/register", label: t("nav.sell"), icon: Store },
    ...(user.roles.includes("ADMIN") ? [{ href: "/admin", label: t("nav.admin"), icon: Shield }] : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-sunken">
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initials(user.name)}
          {unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-berry-600" />}
        </span>
        <span className="hidden flex-col text-left leading-tight lg:flex">
          <span className="text-[11px] text-fg-subtle">{t("nav.hello")}, {user.name.split(" ")[0]}</span>
          <span className="flex items-center gap-0.5 text-sm font-semibold text-fg">
            {t("nav.account")} <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 animate-fade-in rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-fg-subtle">{user.email}</p>
          </div>
          {items.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-surface-muted">
              <item.icon className="h-4 w-4 text-fg-muted" />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && !!item.badge && <span className="rounded-full bg-berry-600 px-1.5 text-[11px] font-bold text-white">{item.badge}</span>}
            </Link>
          ))}
          <button role="menuitem" onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-line px-3 py-2 text-sm text-fg-muted hover:bg-surface-muted">
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
