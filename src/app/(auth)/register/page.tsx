import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/session";
import { safeReturnPath } from "@/server/auth/guards";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.createAccount"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeReturnPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const { t } = await getI18n();
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("auth.createAccountTitle")}</h1>
      <p className="mt-1 text-sm text-fg-muted">{t("auth.registerSubtitle")}</p>
      <div className="mt-6">
        <RegisterForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-fg-muted">
        {t("auth.haveAccount")}{" "}
        <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
