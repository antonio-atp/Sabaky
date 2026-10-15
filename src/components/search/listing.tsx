import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { searchEngine } from "@/server/services/search";
import { flatCategories } from "@/server/services/catalog";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ActiveFilterChips, SearchFilters, SortSelect } from "./filters";
import { qs } from "@/lib/utils";
import type { SearchParams } from "@/shared/validation";

/**
 * Shared listing (search results, category pages, storefronts): facets,
 * sort, chips, grid and pagination — all driven by URL state (shareable,
 * back-button friendly, SSR'd).
 */
export async function ProductListing({
  params,
  basePath,
  categoryIds,
  sellerId,
  showCategoryFacet = true,
}: {
  params: SearchParams;
  basePath: string;
  categoryIds?: string[];
  sellerId?: string;
  showCategoryFacet?: boolean;
}) {
  const { t, locale, number } = await getI18n();
  const [result, categories] = await Promise.all([searchEngine.search({ ...params, categoryIds, sellerId }), flatCategories(locale)]);

  const facetCategories = result.facets.categories
    .map((f) => {
      const c = categories.find((x) => x.id === f.id);
      return c ? { slug: c.slug, name: c.name, count: f.count } : null;
    })
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => b.count - a.count);

  const chipLabels: Record<string, string> = {};
  for (const b of result.facets.brands) chipLabels[`brand:${b.slug}`] = b.name;
  for (const c of facetCategories) chipLabels[`category:${c.slug}`] = c.name;

  const facets = { brands: result.facets.brands, categories: facetCategories, priceRange: result.facets.priceRange };

  const hrefFor = (page: number) =>
    `${basePath}${qs({ ...params, brand: params.brand, page: page > 1 ? page : undefined, sort: params.sort === "relevance" ? undefined : params.sort })}`;

  return (
    <div className="flex gap-6">
      <Suspense>
        <SearchFilters mode="sidebar" facets={facets} showCategories={showCategoryFacet} />
      </Suspense>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-muted" aria-live="polite">
            {t("search.resultCount", { count: result.total, formatted: number(result.total) })}
          </p>
          <div className="flex items-center gap-2">
            <Suspense>
              <SearchFilters mode="button" facets={facets} showCategories={showCategoryFacet} />
              <SortSelect />
            </Suspense>
          </div>
        </div>
        <Suspense>
          <ActiveFilterChips labels={chipLabels} />
        </Suspense>
        {result.items.length ? (
          <>
            <ProductGrid products={result.items} priorityCount={4} className="xl:grid-cols-4" />
            <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
          </>
        ) : (
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title={t("search.noResults")}
            description={t("search.noResultsHint")}
            action={
              <ButtonLink href="/" variant="secondary">
                {t("common.backHome")}
              </ButtonLink>
            }
          />
        )}
      </div>
    </div>
  );
}
