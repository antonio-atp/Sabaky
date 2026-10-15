import { requireRole } from "@/server/auth/guards";
import { getI18n } from "@/i18n/server";
import { db } from "@/server/db";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("/admin", "ADMIN");
  const { t } = await getI18n();
  const [pendingSellers, openRisk, reportedReviews, pendingProducts, pendingRefunds] = await Promise.all([
    db.seller.count({ where: { status: "PENDING" } }),
    db.riskEvent.count({ where: { status: "OPEN" } }),
    db.review.count({ where: { OR: [{ status: "PENDING" }, { reports: { some: { status: "OPEN" } } }] } }),
    db.product.count({ where: { OR: [{ status: "PENDING_REVIEW" }, { reports: { some: { status: "OPEN" } } }] } }),
    db.refund.count({ where: { status: "REQUESTED" } }),
  ]);

  return (
    <DashboardShell
      tone="ink"
      area={t("admin.console")}
      nav={[
        { href: "/admin", label: t("admin.nav.analytics"), icon: "LayoutDashboard", exact: true },
        { href: "/admin/users", label: t("admin.nav.users"), icon: "Users" },
        { href: "/admin/sellers", label: t("admin.nav.sellers"), icon: "BadgeCheck", badge: pendingSellers },
        { href: "/admin/products", label: t("admin.nav.products"), icon: "Package", badge: pendingProducts },
        { href: "/admin/orders", label: t("admin.nav.orders"), icon: "Receipt" },
        { href: "/admin/refunds", label: t("admin.nav.refunds"), icon: "RotateCcw", badge: pendingRefunds },
        { href: "/admin/reviews", label: t("admin.nav.reviews"), icon: "Flag", badge: reportedReviews },
        { href: "/admin/risk", label: t("admin.nav.risk"), icon: "ShieldAlert", badge: openRisk },
        { href: "/admin/promotions", label: t("admin.nav.promotions"), icon: "Tag" },
        { href: "/admin/audit", label: t("admin.nav.audit"), icon: "ScrollText" },
        { href: "/admin/settings", label: t("admin.nav.settings"), icon: "Settings" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
