import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { searchParamsSchema } from "@/shared/validation";
import { getCategoryBySlug } from "@/server/services/catalog";
import { ProductListing } from "@/components/search/listing";
import { Breadcrumbs } from "@/components/ui/pagination";

type Props = { searchParams: Promise<Record<string, string | string[]>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { t } = await getI18n();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return { title: q ? t("search.titleFor", { q }) : t("search.title"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const { t, locale } = await getI18n();
  const parsed = searchParamsSchema.safeParse(await searchParams);
  const params = parsed.success ? parsed.data : searchParamsSchema.parse({});
  const category = params.category ? await getCategoryBySlug(params.category, locale) : null;

  return (
    <div className="container-page space-y-4 py-5">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("search.title") }]} />
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{params.q ? t("search.titleFor", { q: params.q }) : category ? category.name : t("search.allProducts")}</h1>
      <ProductListing params={params} basePath="/search" categoryIds={category?.ids} />
    </div>
  );
}
