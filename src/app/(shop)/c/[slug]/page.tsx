import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { searchParamsSchema } from "@/shared/validation";
import { getCategoryBySlug } from "@/server/services/catalog";
import { ProductListing } from "@/components/search/listing";
import { Breadcrumbs } from "@/components/ui/pagination";
import { CategoryIcon } from "@/components/product/category-icon";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[]>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const category = await getCategoryBySlug((await params).slug, locale);
  return category ? { title: category.name, description: t("category.metaDescription", { name: category.name }) } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();

  const parsed = searchParamsSchema.safeParse(await searchParams);
  const query = { ...(parsed.success ? parsed.data : searchParamsSchema.parse({})), category: undefined };

  return (
    <div className="container-page space-y-5 py-5">
      <Breadcrumbs
        items={[
          { label: t("nav.home"), href: "/" },
          ...(category.parent ? [{ label: category.parent.name, href: `/c/${category.parent.slug}` }] : []),
          { label: category.name },
        ]}
      />
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white">
          <CategoryIcon name={category.icon} className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
      </div>
      {category.children.length > 0 && (
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {category.children.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-brand-500 hover:text-brand-700">
              <CategoryIcon name={c.icon} className="h-4 w-4 text-brand-600" />
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <ProductListing params={query} basePath={`/c/${slug}`} categoryIds={category.ids} showCategoryFacet={false} />
    </div>
  );
}
