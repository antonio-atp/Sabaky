"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, ButtonLink } from "@/components/ui/button";

/** Route-level error boundary. Never renders error details (they may contain internals). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error.digest ?? "client error");
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-berry-50 text-berry-600">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </span>
      <div>
        <h1 className="text-xl font-bold">{t("errors.pageTitle")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("errors.pageText")}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-fg-subtle">ref: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>{t("common.tryAgain")}</Button>
        <ButtonLink href="/" variant="outline">
          {t("common.backHome")}
        </ButtonLink>
      </div>
    </div>
  );
}
