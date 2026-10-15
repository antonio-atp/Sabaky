"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function ResendVerification() {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sunrise-100 bg-sunrise-50 p-4 sm:flex-row sm:items-center">
      <MailWarning className="h-5 w-5 shrink-0 text-sunrise-600" aria-hidden />
      <p className="flex-1 text-sm">{t("account.verifyBanner")}</p>
      <Button
        size="sm"
        variant="outline"
        loading={state === "sending"}
        disabled={state === "sent"}
        onClick={async () => {
          setState("sending");
          await api("/auth/verify-email", { method: "PUT" }).catch(() => {});
          setState("sent");
        }}
      >
        {state === "sent" ? t("account.verifySent") : t("account.verifyResend")}
      </Button>
    </div>
  );
}
