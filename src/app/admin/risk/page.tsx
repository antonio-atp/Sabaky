import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { listRiskEvents } from "@/server/services/admin";
import { DataTable, FilterTabs, PageHeader, Td } from "@/components/dashboard/data-table";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.risk"), robots: { index: false } };
}

const STATUSES = ["OPEN", "REVIEWING", "DISMISSED", "CONFIRMED"] as const;

export default async function AdminRiskPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? (sp.status as (typeof STATUSES)[number]) : undefined;
  const { t, price, date } = await getI18n();
  const events = await listRiskEvents(status);

  return (
    <div>
      <PageHeader title={t("admin.nav.risk")} subtitle={t("admin.riskHint")} />
      <FilterTabs active={status ?? "active"} items={[{ key: "active", label: t("admin.activeFlags"), href: "/admin/risk" }, ...STATUSES.map((s) => ({ key: s, label: t(`riskStatus.${s}`), href: `/admin/risk?status=${s}` }))]} />
      {events.length ? (
        <DataTable head={[t("admin.table.score"), t("admin.table.type"), t("admin.table.subject"), t("admin.table.details"), t("admin.table.status"), t("admin.table.placed"), ""]}>
          {events.map((e) => (
            <tr key={e.id}>
              <Td>
                <span className={`inline-grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${e.score >= 70 ? "bg-berry-600 text-white" : e.score >= 50 ? "bg-sunrise-400 text-ink-950" : "bg-surface-sunken"}`}>{e.score}</span>
              </Td>
              <Td className="text-xs font-semibold">{t(`riskType.${e.type}`)}</Td>
              <Td className="text-xs">
                {e.user && <p>{e.user.email}</p>}
                {e.seller && <p>{e.seller.storeName}</p>}
                {e.order && (
                  <p className="font-mono">
                    {e.order.number} · {price(e.order.total)}
                  </p>
                )}
                {!e.user && !e.seller && !e.order && <p className="text-fg-subtle">{t("admin.network")}</p>}
              </Td>
              <Td className="max-w-64 text-xs text-fg-muted">
                <code className="line-clamp-3 break-all">{JSON.stringify(e.details)}</code>
              </Td>
              <Td>
                <Badge tone={e.status === "OPEN" ? "danger" : e.status === "REVIEWING" ? "warning" : "neutral"}>{t(`riskStatus.${e.status}`)}</Badge>
              </Td>
              <Td className="text-xs text-fg-muted">{date(e.createdAt, { dateStyle: "short", timeStyle: "short" })}</Td>
              <Td>
                {(e.status === "OPEN" || e.status === "REVIEWING") && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {e.status === "OPEN" && <ActionButton endpoint={`/admin/risk/${e.id}`} body={{ status: "REVIEWING" }} label={t("admin.investigate")} variant="ghost" />}
                    <ActionButton endpoint={`/admin/risk/${e.id}`} body={{ status: "DISMISSED" }} label={t("admin.dismiss")} />
                    <ActionButton endpoint={`/admin/risk/${e.id}`} body={{ status: "CONFIRMED" }} label={t("admin.confirmFraud")} variant="danger" />
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t("admin.noRisk")} />
      )}
    </div>
  );
}
