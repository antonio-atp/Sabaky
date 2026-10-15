import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { listSellerProducts } from "@/server/services/seller";
import { DataTable, FilterTabs, PageHeader, Td } from "@/components/dashboard/data-table";
import { ArchiveProductButton } from "@/components/seller/archive-product-button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { qs } from "@/lib/utils";

const STATUSES = ["ACTIVE", "PENDING_REVIEW", "DRAFT", "REJECTED"] as const;
const TONE = { ACTIVE: "success", PENDING_REVIEW: "warning", DRAFT: "neutral", REJECTED: "danger", ARCHIVED: "neutral" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.nav.products"), robots: { index: false } };
}

export default async function SellerProductsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const { seller } = await requireSellerPage("/seller/products");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, price, date } = await getI18n();
  const products = await listSellerProducts(seller.id, { status, q: sp.q?.slice(0, 80), page });

  return (
    <div>
      <PageHeader
        title={t("seller.nav.products")}
        subtitle={t("seller.productTotal", { count: products.total })}
        action={
          <ButtonLink href="/seller/products/new">
            <Plus className="h-4 w-4" /> {t("seller.addProduct")}
          </ButtonLink>
        }
      />
      <form className="mb-3">
        <input name="q" defaultValue={sp.q} placeholder={t("seller.searchProducts")} className="h-10 w-full max-w-sm rounded-xl border border-line-strong bg-surface px-3.5 text-sm" />
        {status && <input type="hidden" name="status" value={status} />}
      </form>
      <FilterTabs
        active={status ?? "all"}
        items={[{ key: "all", label: t("common.all"), href: "/seller/products" }, ...STATUSES.map((s) => ({ key: s, label: t(`productStatus.${s}`), href: `/seller/products?status=${s}` }))]}
      />
      {products.items.length ? (
        <DataTable head={[t("seller.table.product"), t("seller.table.status"), t("seller.table.price"), t("seller.table.stock"), t("seller.table.sold"), t("seller.table.updated"), ""]}>
          {products.items.map((p) => (
            <tr key={p.id} className="hover:bg-surface-muted/50">
              <Td>
                <div className="flex items-center gap-3">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                    {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/seller/products/${p.id}/edit`} className="line-clamp-1 font-medium hover:text-brand-700">
                      {p.title}
                    </Link>
                    <p className="text-xs text-fg-subtle">{t("seller.variantCount", { count: p._count.variants })}</p>
                    {p.moderationNote && <p className="text-xs text-berry-600">{p.moderationNote}</p>}
                  </div>
                </div>
              </Td>
              <Td>
                <Badge tone={TONE[p.status]}>{t(`productStatus.${p.status}`)}</Badge>
              </Td>
              <Td className="tabular">{price(p.price)}</Td>
              <Td className={p.totalStock <= 5 ? "font-semibold text-sunrise-600 tabular" : "tabular"}>{p.totalStock}</Td>
              <Td className="tabular">{p.salesCount}</Td>
              <Td className="text-xs text-fg-muted">{date(p.updatedAt)}</Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <ButtonLink href={`/seller/products/${p.id}/edit`} size="sm" variant="outline">
                    {t("common.edit")}
                  </ButtonLink>
                  <ArchiveProductButton id={p.id} />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState icon={<Package className="h-6 w-6" />} title={t("seller.noProducts")} action={<ButtonLink href="/seller/products/new">{t("seller.addProduct")}</ButtonLink>} />
      )}
      <div className="mt-5">
        <Pagination page={page} pageCount={products.pageCount} hrefFor={(p) => `/seller/products${qs({ status, q: sp.q, page: p })}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
      </div>
    </div>
  );
}
