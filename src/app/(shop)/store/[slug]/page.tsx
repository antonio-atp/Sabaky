import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, MapPin, Package } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getStorefront } from "@/server/services/catalog";
import { searchParamsSchema } from "@/shared/validation";
import { ProductListing } from "@/components/search/listing";
import { Rating } from "@/components/ui/misc";
import { COUNTRIES, isCountry } from "@/shared/config/countries";
import { initials } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[]>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await getStorefront((await params).slug);
  return store ? { title: store.storeName, description: store.description ?? undefined } : {};
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { t, date } = await getI18n();
  const store = await getStorefront(slug);
  if (!store) notFound();
  const parsed = searchParamsSchema.safeParse(await searchParams);
  const query = { ...(parsed.success ? parsed.data : searchParamsSchema.parse({})), seller: undefined };

  return (
    <div className="pb-6">
      <div className="h-36 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 sm:h-48" />
      <div className="container-page">
        <div className="card -mt-16 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-ink-900 text-2xl font-extrabold text-white ring-4 ring-surface">{initials(store.storeName)}</span>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              {store.storeName}
              <BadgeCheck className="h-5 w-5 text-brand-600" aria-label={t("seller.verified")} />
            </h1>
            {store.description && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{store.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
              <span className="flex items-center gap-1.5">
                <Rating value={store.ratingAvg} /> <span className="tabular">{store.ratingAvg.toFixed(1)}</span> ({store.ratingCount})
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4" aria-hidden /> {t("seller.productCount", { count: store._count.products })}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden /> {isCountry(store.countryCode) ? COUNTRIES[store.countryCode].name : store.countryCode}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden /> {t("seller.since", { date: date(store.createdAt, { month: "long", year: "numeric" }) })}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <ProductListing params={query} basePath={`/store/${slug}`} sellerId={store.id} />
        </div>
      </div>
    </div>
  );
}
