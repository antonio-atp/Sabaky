import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.forgot"), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("auth.forgotTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-fg-muted">{t("auth.forgotSubtitle")}</p>
      <ForgotPasswordForm />
    </div>
  );
}
