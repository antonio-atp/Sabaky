import { requireUser } from "@/server/auth/guards";
import { getSellerForUser } from "@/server/services/seller";
import { getI18n } from "@/i18n/server";
import { db } from "@/server/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { Header } from "@/components/layout/header";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/seller");
  const seller = await getSellerForUser(user.id);
  const { t } = await getI18n();

  // Not a seller yet → onboarding inside the regular storefront chrome.
  if (!seller) {
    return (
      <>
        <Header />
        <main className="container-page py-8">{children}</main>
      </>
    );
  }

  const openQuestions = await db.productQuestion.count({ where: { product: { sellerId: seller.id }, status: "PENDING" } });
  return (
    <DashboardShell
      area={t("seller.center")}
      nav={[
        { href: "/seller", label: t("seller.nav.overview"), icon: "LayoutDashboard", exact: true },
        { href: "/seller/products", label: t("seller.nav.products"), icon: "Package" },
        { href: "/seller/orders", label: t("seller.nav.orders"), icon: "ShoppingBag" },
        { href: "/seller/customers", label: t("seller.nav.customers"), icon: "Users" },
        { href: "/seller/questions", label: t("seller.nav.questions"), icon: "MessageCircleQuestion", badge: openQuestions },
        { href: "/seller/reviews", label: t("seller.nav.reviews"), icon: "Star" },
        { href: "/seller/settings", label: t("seller.nav.settings"), icon: "Settings" },
        { href: `/store/${seller.slug}`, label: t("seller.nav.storefront"), icon: "Store" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
