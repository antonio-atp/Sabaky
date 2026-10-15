import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getI18n } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { ToastProvider } from "@/components/ui/toast";
import { ShopProvider } from "@/components/providers/shop-provider";
import { getShopContext } from "@/server/context";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-jakarta", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    title: { default: `Sabaky — ${t("meta.tagline")}`, template: "%s · Sabaky" },
    description: t("meta.description"),
    applicationName: "Sabaky",
    openGraph: { siteName: "Sabaky", type: "website" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a8c6f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [i18n, shop] = await Promise.all([getI18n(), getShopContext()]);
  return (
    <html lang={i18n.locale} data-theme="light" className={jakarta.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <I18nProvider locale={i18n.locale} currency={i18n.currency} country={i18n.country} messages={i18n.messages}>
          <ToastProvider>
            <ShopProvider initial={shop}>{children}</ShopProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
