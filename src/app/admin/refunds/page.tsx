import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { listRefunds } from "@/server/services/admin";
import { DataTable, PageHeader, Td } from "@/components/dashboard/data-table";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.refunds"), robots: { index: false } };
}

export default async function AdminRefundsPage() {
  const { t, price, date } = await getI18n();
  const refunds = await listRefunds();
  return (
    <div>
      <PageHeader title={t("admin.nav.refunds")} subtitle={t("admin.refundsHint")} />
      {refunds.length ? (
        <DataTable head={[t("admin.table.order"), t("admin.table.reason"), t("admin.table.amount"), t("admin.table.status"), t("admin.table.placed"), ""]}>
          {refunds.map((r) => (
            <tr key={r.id}>
              <Td className="font-mono text-xs font-semibold">{r.order.number}</Td>
              <Td className="text-xs">
                {r.returnRequest ? (
                  <>
                    <span className="font-medium">{t(`orders.returnReasons.${r.returnRequest.reason}`)}</span> · {r.returnRequest.orderItem.title.slice(0, 40)} × {r.returnRequest.quantity}
                    {r.returnRequest.details && <span className="block text-fg-subtle">{r.returnRequest.details}</span>}
                  </>
                ) : (
                  r.reason
                )}
              </Td>
              <Td className="font-semibold tabular">{price(r.amount)}</Td>
              <Td>
                <Badge tone={r.status === "REQUESTED" ? "warning" : r.status === "FAILED" ? "danger" : "brand"}>{t(`refundStatus.${r.status}`)}</Badge>
              </Td>
              <Td className="text-xs text-fg-muted">{date(r.createdAt)}</Td>
              <Td>
                {r.status === "REQUESTED" && (
                  <div className="flex justify-end gap-1">
                    <ActionButton endpoint={`/admin/refunds/${r.id}`} body={{ decision: "APPROVED" }} label={t("admin.approveRefund")} variant="primary" confirmText={t("admin.confirmRefund", { amount: price(r.amount) })} />
                    <ActionButton endpoint={`/admin/refunds/${r.id}`} body={{ decision: "REJECTED" }} label={t("admin.reject")} />
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState icon={<RotateCcw className="h-6 w-6" />} title={t("admin.noRefunds")} />
      )}
    </div>
  );
}
