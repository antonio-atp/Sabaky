import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  // Tokens in the URL must never leak via the Referer header to third parties.
  return { title: t("auth.setPassword"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getI18n();
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("auth.setPassword")}</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">{t("errors.TOKEN_INVALID")}</p>
          <ButtonLink href="/forgot-password" variant="secondary">
            {t("auth.sendResetLink")}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
