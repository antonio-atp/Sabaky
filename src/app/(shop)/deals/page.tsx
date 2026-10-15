import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getFlashDeals, listCards } from "@/server/services/catalog";
import { ProductGrid } from "@/components/product/product-grid";
import { Countdown } from "@/components/product/countdown";
import { EmptyState, SectionHeader } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.flashDeals") };
}

export default async function DealsPage() {
  const { t } = await getI18n();
  const [deals, discounted] = await Promise.all([getFlashDeals(40), listCards({ discountPct: { gte: 20 } }, [{ discountPct: "desc" }], 20)]);
  return (
    <div className="container-page space-y-10 py-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sunrise-300 via-sunrise-400 to-berry-500 p-6 text-ink-950 sm:p-10">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-bold uppercase tracking-wide">
          <Zap className="h-3.5 w-3.5" fill="currentColor" aria-hidden /> {t("deals.badge")}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("deals.title")}</h1>
        <p className="mt-2 max-w-lg text-sm sm:text-base">{t("deals.subtitle")}</p>
        {deals.endsAt && <Countdown endsAt={deals.endsAt} className="mt-5 inline-flex items-center rounded-xl bg-white/70 px-3 py-2" />}
      </section>
      {deals.products.length ? (
        <ProductGrid products={deals.products} priorityCount={5} />
      ) : (
        <EmptyState icon={<Zap className="h-6 w-6" />} title={t("deals.none")} description={t("deals.noneHint")} />
      )}
      {discounted.length > 0 && (
        <section>
          <SectionHeader title={t("deals.biggestDiscounts")} />
          <ProductGrid products={discounted} />
        </section>
      )}
    </div>
  );
}
