import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { listBanners, listCoupons, listPromotions } from "@/server/services/admin";
import { DataTable, PageHeader, Td } from "@/components/dashboard/data-table";
import { ActionButton } from "@/components/admin/action-button";
import { BannerForm } from "@/components/admin/banner-form";
import { CouponForm } from "@/components/seller/store-settings-form";
import { Badge } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.promotions"), robots: { index: false } };
}

export default async function AdminPromotionsPage() {
  const { t, price, date } = await getI18n();
  const [coupons, banners, promotions] = await Promise.all([listCoupons(), listBanners(), listPromotions()]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.nav.promotions")} subtitle={t("admin.promotionsHint")} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.campaigns")}</h2>
        <DataTable head={[t("admin.table.name"), t("admin.table.type"), t("admin.table.products"), t("admin.table.window"), t("admin.table.status")]}>
          {promotions.map((p) => {
            const live = p.isActive && p.startsAt <= new Date() && p.endsAt > new Date();
            return (
              <tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td>
                  <Badge>{t(`promotionKind.${p.kind}`)}</Badge>
                </Td>
                <Td className="tabular">{p._count.products}</Td>
                <Td className="text-xs text-fg-muted">
                  {date(p.startsAt, { dateStyle: "short", timeStyle: "short" })} → {date(p.endsAt, { dateStyle: "short", timeStyle: "short" })}
                </Td>
                <Td>
                  <Badge tone={live ? "success" : "neutral"}>{live ? t("admin.live") : t("admin.inactive")}</Badge>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.coupons")}</h2>
        <CouponForm endpoint="/admin/coupons" />
        <DataTable head={[t("coupons.code"), t("coupons.type"), t("coupons.value"), t("coupons.minSubtotal"), t("coupons.used"), t("admin.table.scope"), t("admin.table.status"), ""]}>
          {coupons.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono font-semibold">{c.code}</Td>
              <Td>
                <Badge>{t(`coupons.types.${c.type}`)}</Badge>
              </Td>
              <Td className="tabular">{c.type === "PERCENT" ? `${c.value / 100}%` : c.type === "FIXED" ? price(c.value) : "—"}</Td>
              <Td className="tabular">{c.minSubtotal ? price(c.minSubtotal) : "—"}</Td>
              <Td className="tabular">
                {c.usedCount}
                {c.usageLimit ? ` / ${c.usageLimit}` : ""}
              </Td>
              <Td className="text-xs">{c.seller?.storeName ?? t("admin.platformWide")}</Td>
              <Td>
                <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? t("admin.active") : t("admin.inactive")}</Badge>
              </Td>
              <Td>
                <ActionButton endpoint="/admin/coupons" method="PATCH" body={{ id: c.id, isActive: !c.isActive }} label={c.isActive ? t("admin.disable") : t("admin.enable")} variant="ghost" />
              </Td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("admin.banners")}</h2>
        <BannerForm />
        <DataTable head={[t("admin.bannerTitle"), t("admin.bannerLink"), t("admin.bannerTheme"), t("admin.table.status"), ""]}>
          {banners.map((b) => (
            <tr key={b.id}>
              <Td>
                <p className="font-medium">{b.title}</p>
                {b.subtitle && <p className="line-clamp-1 text-xs text-fg-muted">{b.subtitle}</p>}
              </Td>
              <Td className="font-mono text-xs">{b.href}</Td>
              <Td className="text-xs">{b.theme}</Td>
              <Td>
                <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? t("admin.active") : t("admin.inactive")}</Badge>
              </Td>
              <Td>
                <ActionButton endpoint="/admin/banners" method="PATCH" body={{ id: b.id, isActive: !b.isActive }} label={b.isActive ? t("admin.disable") : t("admin.enable")} variant="ghost" />
              </Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
