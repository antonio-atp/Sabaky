import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { sellerCustomers } from "@/server/services/seller";
import { displayName } from "@/server/services/catalog";
import { DataTable, PageHeader, Td } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.nav.customers"), robots: { index: false } };
}

export default async function SellerCustomersPage() {
  const { seller } = await requireSellerPage("/seller/customers");
  const { t, price, date } = await getI18n();
  const customers = await sellerCustomers(seller.id);
  return (
    <div>
      {/* Data minimisation: sellers see a display name and purchase history, not contact details. */}
      <PageHeader title={t("seller.nav.customers")} subtitle={t("seller.customersHint")} />
      {customers.length ? (
        <DataTable head={[t("seller.table.customer"), t("seller.table.orders"), t("seller.table.spent"), t("seller.table.lastOrder")]}>
          {customers.map((c, i) => (
            <tr key={i}>
              <Td className="font-medium">{displayName(c.name)}</Td>
              <Td className="tabular">{c.orders}</Td>
              <Td className="tabular">{price(c.spent)}</Td>
              <Td className="text-fg-muted">{date(c.lastOrder)}</Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t("seller.noCustomers")} />
      )}
    </div>
  );
}
