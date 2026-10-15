import Link from "next/link";
import { Suspense } from "react";
import { Zap } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SearchBar } from "./search-bar";
import { PreferencesMenu } from "./preferences-menu";
import { UserMenu } from "./user-menu";
import { CartButton, WishlistButton } from "./header-actions";
import { CategoryMenu } from "./category-menu";
import { getI18n } from "@/i18n/server";
import { getCategoryTree } from "@/server/services/catalog";

export async function Header() {
  const { t, locale } = await getI18n();
  const categories = await getCategoryTree(locale);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="hidden bg-ink-900 text-xs text-white/85 md:block">
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <p className="truncate">
            <span className="font-semibold text-sunrise-300">{t("header.promise")}</span> · {t("header.protection")}
          </p>
          <div className="flex shrink-0 items-center gap-5">
            <Link href="/seller/register" className="hover:text-white">
              {t("nav.sell")}
            </Link>
            <Link href="/legal/help" className="hover:text-white">
              {t("nav.help")}
            </Link>
            <PreferencesMenu />
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-3 md:h-[72px] md:gap-6">
        <Link href="/" aria-label={t("nav.home")} className="shrink-0">
          <Logo className="hidden sm:inline-flex" />
          <Logo compact className="sm:hidden" />
        </Link>
        <Suspense fallback={<div className="h-11 flex-1 rounded-full border-2 border-brand-600" />}>
          <SearchBar className="hidden flex-1 md:block" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <UserMenu />
          <WishlistButton />
          <CartButton />
        </div>
      </div>

      <div className="container-page pb-3 md:hidden">
        <Suspense fallback={<div className="h-11 rounded-full border-2 border-brand-600" />}>
          <SearchBar />
        </Suspense>
      </div>

      <nav aria-label={t("nav.categories")} className="hidden border-t border-line md:block">
        <div className="container-page flex h-12 items-center gap-2">
          <CategoryMenu categories={categories} />
          <Link href="/deals" className="ml-1 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-berry-600 hover:bg-berry-50">
            <Zap className="h-4 w-4" fill="currentColor" aria-hidden />
            {t("nav.flashDeals")}
          </Link>
          <div className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
