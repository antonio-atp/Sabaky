"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import * as Icons from "./icons";

export interface DashNavItem {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  badge?: number;
  exact?: boolean;
}

/** Shared chrome for the Seller Center and the Admin console. */
export function DashboardShell({ area, nav, children, tone = "brand" }: { area: string; nav: DashNavItem[]; children: ReactNode; tone?: "brand" | "ink" }) {
  const { t } = useI18n();
  const path = usePathname();
  const isActive = (item: DashNavItem) => (item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={cn("hidden border-r border-line lg:flex lg:flex-col", tone === "ink" ? "bg-ink-950 text-white" : "bg-surface")}>
        <div className="flex h-16 items-center gap-2 px-5">
          <Link href="/" aria-label={t("nav.home")}>
            <Logo compact />
          </Link>
          <span className={cn("text-sm font-bold", tone === "ink" ? "text-white" : "text-fg")}>{area}</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label={area}>
          {nav.map((item) => {
            const Icon = Icons[item.icon];
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  tone === "ink"
                    ? active
                      ? "bg-white/10 text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white"
                    : active
                      ? "bg-brand-50 text-brand-800"
                      : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && <span className="rounded-full bg-berry-600 px-1.5 text-[11px] font-bold text-white">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>
        <Link href="/" className={cn("m-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm", tone === "ink" ? "text-white/60 hover:text-white" : "text-fg-muted hover:text-fg")}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t("dashboard.backToShop")}
        </Link>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Link href="/" aria-label={t("nav.home")}>
              <Logo compact />
            </Link>
            <span className="text-sm font-bold">{area}</span>
          </div>
          <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2" aria-label={area}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium", isActive(item) ? "bg-brand-600 text-white" : "text-fg-muted hover:bg-surface-sunken")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

