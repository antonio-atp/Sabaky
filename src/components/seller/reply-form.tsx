"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { Button } from "@/components/ui/button";
import { FormError, Textarea } from "@/components/ui/form";

/** Answer a customer question or reply to a review. */
export function ReplyForm({ endpoint, field, placeholder, submitLabel }: { endpoint: string; field: "answer" | "reply"; placeholder: string; submitLabel: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const { loading, error, run } = useFormSubmit();
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api(endpoint, { body: { [field]: text } }))) {
          setText("");
          router.refresh();
        }
      }}
    >
      <FormError message={error} />
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} rows={2} maxLength={2000} required minLength={2} />
      <Button type="submit" size="sm" loading={loading} disabled={text.trim().length < 2}>
        {submitLabel || t("common.send")}
      </Button>
    </form>
  );
}
