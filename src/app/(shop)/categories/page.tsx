import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getCategoryTree } from "@/server/services/catalog";
import { CategoryIcon } from "@/components/product/category-icon";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.allCategories") };
}

export default async function CategoriesPage() {
  const { t, locale } = await getI18n();
  const tree = await getCategoryTree(locale);
  return (
    <div className="container-page py-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">{t("nav.allCategories")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tree.map((root) => (
          <section key={root.id} className="card p-5">
            <Link href={`/c/${root.slug}`} className="flex items-center gap-3 text-base font-semibold hover:text-brand-700">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <CategoryIcon name={root.icon} className="h-5 w-5" />
              </span>
              {root.name}
            </Link>
            <ul className="mt-3 grid grid-cols-2 gap-1">
              {root.children?.map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.slug}`} className="block rounded-lg px-2 py-1.5 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
