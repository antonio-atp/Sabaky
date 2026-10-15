import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { listAuditLogs } from "@/server/services/admin";
import { DataTable, FilterTabs, PageHeader, Td } from "@/components/dashboard/data-table";
import { Pagination } from "@/components/ui/pagination";
import { qs } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.audit"), robots: { index: false } };
}

const PREFIXES = ["auth", "admin", "order", "seller", "product", "privacy"] as const;

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  const sp = await searchParams;
  const action = PREFIXES.includes(sp.action as (typeof PREFIXES)[number]) ? sp.action : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, date } = await getI18n();
  const logs = await listAuditLogs({ action, page });

  return (
    <div>
      <PageHeader title={t("admin.nav.audit")} subtitle={t("admin.auditHint")} />
      <FilterTabs active={action ?? "all"} items={[{ key: "all", label: t("common.all"), href: "/admin/audit" }, ...PREFIXES.map((p) => ({ key: p, label: p, href: `/admin/audit?action=${p}` }))]} />
      <DataTable head={[t("admin.table.time"), t("admin.table.action"), t("admin.table.actor"), t("admin.table.entity"), t("admin.table.details")]}>
        {logs.items.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap text-xs text-fg-muted">{date(l.createdAt, { dateStyle: "short", timeStyle: "medium" })}</Td>
            <Td className="font-mono text-xs font-semibold">{l.action}</Td>
            <Td className="text-xs">{l.actor?.email ?? "system"}</Td>
            <Td className="font-mono text-xs text-fg-muted">
              {l.entityType}
              {l.entityId ? `:${l.entityId.slice(0, 12)}` : ""}
            </Td>
            <Td className="max-w-72 text-xs text-fg-muted">
              <code className="line-clamp-2 break-all">{JSON.stringify(l.metadata)}</code>
            </Td>
          </tr>
        ))}
      </DataTable>
      <div className="mt-5">
        <Pagination page={page} pageCount={logs.pageCount} hrefFor={(p) => `/admin/audit${qs({ action, page: p })}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
      </div>
    </div>
  );
}
