import Link from "next/link";
import { BadgePercent, Flame, Gift, Sparkles, Star, TrendingUp, Truck, Zap } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  getBanners,
  getBestSellers,
  getCategoryTree,
  getFeatured,
  getFlashDeals,
  getNewArrivals,
  getPopular,
} from "@/server/services/catalog";
import { recommender } from "@/server/services/recommendations";
import { Hero } from "@/components/home/hero";
import { RecentlyViewed } from "@/components/home/recently-viewed";
import { ProductGrid, ProductRail } from "@/components/product/product-grid";
import { Countdown } from "@/components/product/countdown";
import { CategoryIcon } from "@/components/product/category-icon";
import { SectionHeader } from "@/components/ui/misc";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const user = await getCurrentUser();
  const [banners, categories, deals, featured, bestSellers, newArrivals, popular, recommended] = await Promise.all([
    getBanners(locale),
    getCategoryTree(locale),
    getFlashDeals(10),
    getFeatured(10),
    getBestSellers(10),
    getNewArrivals(10),
    getPopular(10),
    recommender.forUser(user?.id ?? null, 20),
  ]);

  const seeAll = (href: string) => (
    <Link href={href} className="text-sm font-semibold text-brand-700 hover:underline">
      {t("common.seeAll")} →
    </Link>
  );

  return (
    <div className="container-page space-y-10 py-5 sm:space-y-12 sm:py-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Hero banners={banners.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, ctaLabel: b.ctaLabel, href: b.href, theme: b.theme }))} />
        <div className="hidden grid-rows-2 gap-4 lg:grid">
          <Link href={user ? "/deals" : "/register"} className="group relative overflow-hidden rounded-3xl bg-sunrise-50 p-6 ring-1 ring-sunrise-100">
            <Gift className="h-8 w-8 text-sunrise-600" aria-hidden />
            <p className="mt-3 text-lg font-bold leading-tight">{t("home.welcomeTitle")}</p>
            <p className="mt-1 text-sm text-fg-muted">{t("home.welcomeText", { code: "WELCOME10" })}</p>
            <span className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-sunrise-300/40 transition-transform group-hover:scale-110" />
          </Link>
          <Link href="/search?freeShipping=1" className="group relative overflow-hidden rounded-3xl bg-brand-50 p-6 ring-1 ring-brand-100">
            <Truck className="h-8 w-8 text-brand-700" aria-hidden />
            <p className="mt-3 text-lg font-bold leading-tight">{t("home.shippingTitle")}</p>
            <p className="mt-1 text-sm text-fg-muted">{t("home.shippingText")}</p>
            <span className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-brand-200/50 transition-transform group-hover:scale-110" />
          </Link>
        </div>
      </div>

      {/* Category shortcuts */}
      <section aria-labelledby="cats">
        <h2 id="cats" className="sr-only">
          {t("nav.categories")}
        </h2>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-3 sm:px-0 lg:grid-cols-12">
          {categories.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="group flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl p-2 text-center sm:w-auto">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-brand-700 shadow-[var(--shadow-card)] ring-1 ring-line transition group-hover:-translate-y-0.5 group-hover:bg-brand-600 group-hover:text-white">
                <CategoryIcon name={c.icon} className="h-6 w-6" />
              </span>
              <span className="line-clamp-2 text-xs font-medium text-fg-muted group-hover:text-fg">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {deals.products.length > 0 && deals.endsAt && (
        <section className="rounded-3xl bg-gradient-to-br from-sunrise-50 via-surface to-berry-50 p-4 ring-1 ring-sunrise-100 sm:p-6">
          <ProductRail
            title={t("home.flashDeals")}
            icon={<Zap className="h-5 w-5 text-sunrise-500" fill="currentColor" />}
            subtitle={<Countdown endsAt={deals.endsAt} className="mt-1 inline-flex items-center" />}
            action={seeAll("/deals")}
            products={deals.products}
          />
        </section>
      )}

      <ProductRail
        title={recommended.personalised ? t("home.forYou") : t("home.recommended")}
        subtitle={recommended.personalised ? t("home.forYouHint") : undefined}
        icon={<Sparkles className="h-5 w-5 text-brand-600" />}
        products={recommended.items.slice(0, 10)}
      />

      <ProductRail title={t("home.featured")} icon={<Star className="h-5 w-5 text-sunrise-500" />} action={seeAll("/search?sort=rating")} products={featured} />
      <ProductRail title={t("home.bestSellers")} icon={<Flame className="h-5 w-5 text-berry-600" />} action={seeAll("/search?sort=popular")} products={bestSellers} />
      <ProductRail title={t("home.newArrivals")} icon={<BadgePercent className="h-5 w-5 text-brand-600" />} action={seeAll("/search?sort=newest")} products={newArrivals} />
      <ProductRail title={t("home.trending")} icon={<TrendingUp className="h-5 w-5 text-brand-600" />} products={popular} />

      <RecentlyViewed />

      <section>
        <SectionHeader title={t("home.moreToExplore")} />
        <ProductGrid products={recommended.items.slice(10, 20)} />
      </section>
    </div>
  );
}
