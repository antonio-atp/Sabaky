import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getI18n } from "@/i18n/server";

/** Distraction-free checkout shell (no global nav → higher completion rates). */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label={t("nav.home")}>
            <Logo />
          </Link>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <Lock className="h-4 w-4" aria-hidden /> {t("checkout.secure")}
          </p>
        </div>
      </header>
      <main className="container-page py-6">{children}</main>
    </div>
  );
}
