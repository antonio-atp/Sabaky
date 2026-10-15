import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { flatCategories } from "@/server/services/catalog";
import { ProductForm, emptyProduct } from "@/components/seller/product-form";
import { PageHeader } from "@/components/dashboard/data-table";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.addProduct"), robots: { index: false } };
}

export default async function NewProductPage() {
  await requireSellerPage("/seller/products/new");
  const { t, locale } = await getI18n();
  const categories = await flatCategories(locale);
  const firstLeaf = categories.find((c) => c.parentId) ?? categories[0];
  return (
    <div>
      <PageHeader title={t("seller.addProduct")} subtitle={t("productForm.subtitle")} />
      <ProductForm initial={emptyProduct(firstLeaf?.id ?? "")} categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))} />
    </div>
  );
}
