import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { VerifyEmail } from "@/components/auth/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.verifyTitle"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getI18n();
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="mb-6 text-center text-2xl font-bold tracking-tight">{t("auth.verifyTitle")}</h1>
      {token ? <VerifyEmail token={token} /> : <p className="text-center text-sm text-fg-muted">{t("errors.TOKEN_INVALID")}</p>}
    </div>
  );
}
