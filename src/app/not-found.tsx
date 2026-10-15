import Link from "next/link";
import { Compass } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("errors.notFoundTitle")}</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">{t("errors.notFoundText")}</p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/">{t("common.backHome")}</ButtonLink>
        <ButtonLink href="/search" variant="outline">
          {t("search.submit")}
        </ButtonLink>
      </div>
    </div>
  );
}
