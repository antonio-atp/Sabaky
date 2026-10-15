import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { listSellers } from "@/server/services/admin";
import { FilterTabs, PageHeader } from "@/components/dashboard/data-table";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { qs } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.sellers"), robots: { index: false } };
}

const STATUSES = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const;
const TONE = { PENDING: "warning", VERIFIED: "success", REJECTED: "danger", SUSPENDED: "danger" } as const;

export default async function AdminSellersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, date } = await getI18n();
  const sellers = await listSellers(status, page);

  return (
    <div>
      <PageHeader title={t("admin.nav.sellers")} subtitle={t("admin.sellersHint")} />
      <FilterTabs active={status ?? "all"} items={[{ key: "all", label: t("common.all"), href: "/admin/sellers" }, ...STATUSES.map((s) => ({ key: s, label: t(`seller.status.${s}`), href: `/admin/sellers?status=${s}` }))]} />
      {sellers.items.length ? (
        <ul className="space-y-3">
          {sellers.items.map((s) => {
            const v = s.verifications[0];
            return (
              <li key={s.id} className="card p-5 text-sm">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/store/${s.slug}`} className="text-base font-semibold hover:text-brand-700">
                        {s.storeName}
                      </Link>
                      <Badge tone={TONE[s.status]}>{t(`seller.status.${s.status}`)}</Badge>
                      {s.riskEvents.length > 0 && (
                        <Badge tone="danger">
                          <ShieldAlert className="h-3 w-3" aria-hidden /> {t("admin.riskFlags", { count: s.riskEvents.length })}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      {s.user.name} · {s.user.email} · {s.supportEmail} · {s.countryCode} · {t("admin.applied", { date: date(s.createdAt) })}
                    </p>
                    {v && (
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="text-fg-subtle">{t("sellerRegister.legalName")}</dt>
                          <dd className="font-medium">{v.legalName}</dd>
                        </div>
                        <div>
                          <dt className="text-fg-subtle">{t("sellerRegister.businessType")}</dt>
                          <dd className="font-medium">{t(`sellerRegister.${v.businessType}`)}</dd>
                        </div>
                        <div>
                          <dt className="text-fg-subtle">{t("sellerRegister.vatNumber")}</dt>
                          <dd className="font-medium">{v.hasVat ? t("admin.provided") : "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-fg-subtle">{t("admin.activity")}</dt>
                          <dd className="font-medium">
                            {t("seller.productCount", { count: s._count.products })} · {t("admin.itemsSold", { count: s._count.orderItems })}
                          </dd>
                        </div>
                      </dl>
                    )}
                    {v?.reviewNotes && <p className="mt-2 rounded-lg bg-surface-muted p-2 text-xs">{v.reviewNotes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.status !== "VERIFIED" && <ActionButton endpoint={`/admin/sellers/${s.id}`} body={{ decision: "VERIFIED", notes: null }} label={t("admin.approve")} variant="primary" />}
                    {s.status === "PENDING" && <ActionButton endpoint={`/admin/sellers/${s.id}`} body={{ decision: "REJECTED" }} label={t("admin.reject")} variant="outline" notePrompt={t("admin.reasonPrompt")} />}
                    {s.status === "VERIFIED" && <ActionButton endpoint={`/admin/sellers/${s.id}`} body={{ decision: "SUSPENDED" }} label={t("admin.suspend")} variant="danger" notePrompt={t("admin.reasonPrompt")} />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={t("admin.noSellers")} />
      )}
      <div className="mt-5">
        <Pagination page={page} pageCount={sellers.pageCount} hrefFor={(p) => `/admin/sellers${qs({ status, page: p })}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
      </div>
    </div>
  );
}
