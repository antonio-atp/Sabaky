"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button, type ButtonVariant } from "@/components/ui/button";

/**
 * One-click privileged action (moderation, approvals). Optional confirmation
 * and optional note prompt; the server re-checks the ADMIN role and audits.
 */
export function ActionButton({
  endpoint,
  body,
  label,
  variant = "outline",
  confirmText,
  notePrompt,
  noteField = "notes",
  method = "POST",
}: {
  endpoint: string;
  body: Record<string, unknown>;
  label: string;
  variant?: ButtonVariant;
  confirmText?: string;
  notePrompt?: string;
  noteField?: string;
  method?: "POST" | "PATCH";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant={variant}
      loading={busy}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        let note: string | null = null;
        if (notePrompt) {
          note = prompt(notePrompt);
          if (note === null) return;
        }
        setBusy(true);
        try {
          await api(endpoint, { method, body: notePrompt ? { ...body, [noteField]: note } : body });
          toast("success", "common.saved");
          router.refresh();
        } catch (e) {
          toast("error", e instanceof ApiClientError ? e.message : "errors.INTERNAL");
        } finally {
          setBusy(false);
        }
      }}
    >
      {label || t("common.save")}
    </Button>
  );
}
