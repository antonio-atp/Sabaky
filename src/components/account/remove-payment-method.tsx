"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";

export function RemovePaymentMethod({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        if (!confirm(t("payments.confirmRemove"))) return;
        await api(`/account/payment-methods/${id}`, { method: "DELETE" }).catch(() => {});
        router.refresh();
      }}
      className="rounded-lg p-2 text-fg-muted hover:bg-berry-50 hover:text-berry-600"
      aria-label={t("common.remove")}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
