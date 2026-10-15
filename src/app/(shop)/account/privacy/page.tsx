import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { latestConsents } from "@/server/services/account";
import { ConsentSettings, DataExport, DeleteAccount } from "@/components/account/privacy-center";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.privacy"), robots: { index: false } };
}

export default async function PrivacyPage() {
  const user = await requireUser("/account/privacy");
  const { t } = await getI18n();
  const consents = await latestConsents(user.id);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.privacy")}</h1>
      <div className="flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
        <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
        <p>
          {t("privacy.intro")}{" "}
          <Link href="/legal/privacy" className="font-semibold underline">
            {t("footer.privacy")}
          </Link>
        </p>
      </div>
      <ConsentSettings
        initial={{
          marketing: consents.marketing ?? consents["cookies.marketing"] ?? false,
          personalization: consents.personalization ?? consents["cookies.personalization"] ?? false,
          analytics: consents.analytics ?? consents["cookies.analytics"] ?? false,
        }}
      />
      <DataExport />
      <DeleteAccount />
    </div>
  );
}
