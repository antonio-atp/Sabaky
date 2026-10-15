import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { getI18n } from "@/i18n/server";
import { getPlatformSettings } from "@/server/services/settings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, settings] = await Promise.all([getI18n(), getPlatformSettings()]);
  return (
    <>
      {settings.maintenanceMode && (
        <div role="status" className="bg-sunrise-400 px-4 py-2 text-center text-sm font-medium text-ink-950">
          {t("header.maintenance")}
        </div>
      )}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        {t("nav.skipToContent")}
      </a>
      <Header />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <MobileNav />
      <CookieConsent />
    </>
  );
}
