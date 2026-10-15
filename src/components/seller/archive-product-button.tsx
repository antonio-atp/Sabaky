"use client";

import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";

export function ArchiveProductButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        if (!confirm(t("seller.confirmArchive"))) return;
        await api(`/seller/products/${id}`, { method: "DELETE" }).catch(() => {});
        router.refresh();
      }}
      className="rounded-lg p-2 text-fg-muted hover:bg-berry-50 hover:text-berry-600"
      aria-label={t("seller.archive")}
      title={t("seller.archive")}
    >
      <Archive className="h-4 w-4" />
    </button>
  );
}
