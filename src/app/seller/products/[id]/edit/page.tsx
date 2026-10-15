import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { flatCategories } from "@/server/services/catalog";
import { getSellerProduct } from "@/server/services/seller";
import { ProductForm } from "@/components/seller/product-form";
import { PageHeader } from "@/components/dashboard/data-table";
import { AppError } from "@/server/http/errors";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("productForm.edit"), robots: { index: false } };
}

const major = (minor: number | null | undefined) => (minor == null ? "" : (minor / 100).toFixed(2));

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSellerPage(`/seller/products/${id}/edit`);
  const { t, locale } = await getI18n();
  const product = await getSellerProduct(seller.id, id).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const categories = await flatCategories(locale);

  return (
    <div>
      <PageHeader title={t("productForm.edit")} subtitle={product.title} />
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))}
        initial={{
          id: product.id,
          title: product.title,
          description: product.description,
          categoryId: product.categoryId,
          brandName: product.brand?.name ?? "",
          condition: product.condition,
          highlights: product.highlights.length ? product.highlights : [""],
          specifications: ((product.specifications as { label: string; value: string }[]) ?? []).length
            ? (product.specifications as { label: string; value: string }[])
            : [{ label: "", value: "" }],
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
          variants: product.variants
            .filter((v) => v.isActive)
            .map((v) => ({
              id: v.id,
              sku: v.sku,
              name: v.name,
              color: v.color ?? "",
              colorHex: v.colorHex ?? "#0f1f1b",
              size: v.size ?? "",
              price: major(v.price),
              compareAtPrice: major(v.compareAtPrice),
              stock: String(v.inventory?.quantity ?? 0),
              isActive: v.isActive,
            })),
          shippingCost: major(product.shippingCost),
          freeShipping: product.freeShipping,
          deliveryDaysMin: String(product.deliveryDaysMin),
          deliveryDaysMax: String(product.deliveryDaysMax),
        }}
      />
    </div>
  );
}
