import Link from "next/link";
import { BadgeCheck, CreditCard, RotateCcw, Truck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getI18n } from "@/i18n/server";
import { PreferencesMenu } from "./preferences-menu";
import { CookieSettingsLink } from "./cookie-consent";

export async function Footer() {
  const { t } = await getI18n();
  const promises = [
    { icon: BadgeCheck, title: t("footer.promise.protection"), text: t("footer.promise.protectionText") },
    { icon: RotateCcw, title: t("footer.promise.returns"), text: t("footer.promise.returnsText") },
    { icon: Truck, title: t("footer.promise.tracking"), text: t("footer.promise.trackingText") },
    { icon: CreditCard, title: t("footer.promise.payments"), text: t("footer.promise.paymentsText") },
  ];
  const columns = [
    {
      title: t("footer.shop"),
      links: [
        { href: "/deals", label: t("nav.flashDeals") },
        { href: "/search?sort=newest", label: t("home.newArrivals") },
        { href: "/search?sort=popular", label: t("home.bestSellers") },
        { href: "/categories", label: t("nav.allCategories") },
      ],
    },
    {
      title: t("footer.account"),
      links: [
        { href: "/account/orders", label: t("account.nav.orders") },
        { href: "/wishlist", label: t("nav.wishlist") },
        { href: "/account/privacy", label: t("account.nav.privacy") },
        { href: "/legal/help", label: t("nav.help") },
      ],
    },
    {
      title: t("footer.sell"),
      links: [
        { href: "/seller/register", label: t("nav.sell") },
        { href: "/seller", label: t("nav.sellerDashboard") },
        { href: "/legal/seller-terms", label: t("footer.sellerTerms") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/legal/terms", label: t("footer.terms") },
        { href: "/legal/privacy", label: t("footer.privacy") },
        { href: "/legal/cookies", label: t("footer.cookies") },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-line bg-surface pb-20 md:pb-0">
      <div className="border-b border-line">
        <div className="container-page grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {promises.map((p) => (
            <div key={p.title} className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="container-page grid gap-10 py-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-fg-muted">{t("footer.about")}</p>
          <PreferencesMenu variant="footer" />
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-fg-muted hover:text-brand-700">
                    {l.label}
                  </Link>
                </li>
              ))}
              {col.title === t("footer.legal") && (
                <li>
                  <CookieSettingsLink />
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Sabaky. {t("footer.rights")}</p>
          <p>{t("footer.vatNote")}</p>
        </div>
      </div>
    </footer>
  );
}
