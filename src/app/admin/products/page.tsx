import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Flag } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { listProductsAdmin } from "@/server/services/admin";
import { DataTable, FilterTabs, PageHeader, Td } from "@/components/dashboard/data-table";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { qs } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.products"), robots: { index: false } };
}

const FILTERS = ["PENDING_REVIEW", "ACTIVE", "REJECTED", "ARCHIVED", "reported"] as const;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.status as (typeof FILTERS)[number]) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, price } = await getI18n();
  const products = await listProductsAdmin({ status: filter === "reported" ? undefined : filter, reported: filter === "reported", q: sp.q?.slice(0, 80), page });

  return (
    <div>
      <PageHeader title={t("admin.nav.products")} subtitle={t("admin.totalCount", { count: products.total })} />
      <form className="mb-3">
        <input name="q" defaultValue={sp.q} placeholder={t("seller.searchProducts")} className="h-10 w-full max-w-sm rounded-xl border border-line-strong bg-surface px-3.5 text-sm" />
      </form>
      <FilterTabs
        active={filter ?? "all"}
        items={[
          { key: "all", label: t("common.all"), href: "/admin/products" },
          ...FILTERS.map((f) => ({ key: f, label: f === "reported" ? t("admin.reported") : t(`productStatus.${f}`), href: `/admin/products?status=${f}` })),
        ]}
      />
      <DataTable head={[t("seller.table.product"), t("admin.table.seller"), t("seller.table.status"), t("seller.table.price"), t("seller.table.stock"), ""]}>
        {products.items.map((p) => (
          <tr key={p.id}>
            <Td>
              <div className="flex items-center gap-3">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                  {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}
                </span>
                <div className="min-w-0">
                  <Link href={`/p/${p.slug}`} className="line-clamp-1 font-medium hover:text-brand-700">
                    {p.title}
                  </Link>
                  <p className="text-xs text-fg-subtle">
                    {p.category.name}
                    {p._count.reports > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-berry-600">
                        <Flag className="h-3 w-3" aria-hidden /> {t("admin.reportCount", { count: p._count.reports })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Td>
            <Td className="text-xs">{p.seller.storeName}</Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                <Badge tone={p.status === "ACTIVE" ? "success" : p.status === "PENDING_REVIEW" ? "warning" : "neutral"}>{t(`productStatus.${p.status}`)}</Badge>
                {p.isFeatured && <Badge tone="brand">{t("admin.featured")}</Badge>}
              </div>
            </Td>
            <Td className="tabular">{price(p.price)}</Td>
            <Td className="tabular">{p.totalStock}</Td>
            <Td>
              <div className="flex flex-wrap justify-end gap-1">
                {p.status !== "ACTIVE" && <ActionButton endpoint={`/admin/products/${p.id}`} body={{ action: "approve", note: null }} label={t("admin.approve")} variant="primary" />}
                {p.status !== "REJECTED" && <ActionButton endpoint={`/admin/products/${p.id}`} body={{ action: "reject" }} label={t("admin.reject")} notePrompt={t("admin.reasonPrompt")} noteField="note" />}
                {p.status === "ACTIVE" && (
                  <ActionButton endpoint={`/admin/products/${p.id}`} body={{ action: p.isFeatured ? "unfeature" : "feature", note: null }} label={p.isFeatured ? t("admin.unfeature") : t("admin.feature")} variant="ghost" />
                )}
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
      <div className="mt-5">
        <Pagination page={page} pageCount={products.pageCount} hrefFor={(p) => `/admin/products${qs({ status: filter, q: sp.q, page: p })}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
      </div>
    </div>
  );
}
