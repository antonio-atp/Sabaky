import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { db } from "@/server/db";
import { CouponForm, StoreSettingsForm } from "@/components/seller/store-settings-form";
import { DataTable, PageHeader, Td } from "@/components/dashboard/data-table";
import { Badge } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.nav.settings"), robots: { index: false } };
}

export default async function SellerSettingsPage() {
  const { seller } = await requireSellerPage("/seller/settings");
  const { t, price, date } = await getI18n();
  const coupons = await db.coupon.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="space-y-5">
      <PageHeader title={t("seller.nav.settings")} subtitle={t(`seller.status.${seller.status}`)} />
      <StoreSettingsForm
        initial={{
          storeName: seller.storeName,
          description: seller.description ?? "",
          supportEmail: seller.supportEmail,
          freeShippingThreshold: seller.freeShippingThreshold != null ? (seller.freeShippingThreshold / 100).toFixed(2) : "",
          handlingDays: String(seller.handlingDays),
        }}
      />
      {seller.status === "VERIFIED" && <CouponForm endpoint="/seller/coupons" />}
      {coupons.length > 0 && (
        <DataTable head={[t("coupons.code"), t("coupons.type"), t("coupons.value"), t("coupons.used"), t("coupons.created")]}>
          {coupons.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono font-semibold">{c.code}</Td>
              <Td>
                <Badge>{t(`coupons.types.${c.type}`)}</Badge>
              </Td>
              <Td className="tabular">{c.type === "PERCENT" ? `${c.value / 100}%` : c.type === "FIXED" ? price(c.value) : "—"}</Td>
              <Td className="tabular">
                {c.usedCount}
                {c.usageLimit ? ` / ${c.usageLimit}` : ""}
              </Td>
              <Td className="text-fg-muted">{date(c.createdAt)}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
