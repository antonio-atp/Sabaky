import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getI18n } from "@/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 via-surface-muted to-surface-muted">
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label={t("nav.home")}>
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:py-12">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
            <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden /> {t("auth.secureNote")}
          </p>
        </div>
      </main>
      <footer className="container-page flex flex-wrap justify-center gap-4 py-6 text-xs text-fg-subtle">
        <Link href="/legal/terms" className="hover:text-fg">
          {t("footer.terms")}
        </Link>
        <Link href="/legal/privacy" className="hover:text-fg">
          {t("footer.privacy")}
        </Link>
        <Link href="/legal/help" className="hover:text-fg">
          {t("nav.help")}
        </Link>
      </footer>
    </div>
  );
}
