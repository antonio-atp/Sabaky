"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";

export function ConsentSettings({ initial }: { initial: { marketing: boolean; personalization: boolean; analytics: boolean } }) {
  const { t } = useI18n();
  const toast = useToast();
  const [c, setC] = useState(initial);
  const [saving, setSaving] = useState(false);
  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-base font-bold">{t("privacy.consents")}</h2>
      <Checkbox checked={c.marketing} onChange={(e) => setC({ ...c, marketing: e.target.checked })} label={t("privacy.marketing")} />
      <Checkbox checked={c.personalization} onChange={(e) => setC({ ...c, personalization: e.target.checked })} label={t("privacy.personalization")} />
      <Checkbox checked={c.analytics} onChange={(e) => setC({ ...c, analytics: e.target.checked })} label={t("privacy.analytics")} />
      <Button
        loading={saving}
        onClick={async () => {
          setSaving(true);
          await Promise.all([api("/account/privacy", { method: "PATCH", body: c }), api("/consent", { body: c })]).catch(() => {});
          setSaving(false);
          toast("success", "common.saved");
        }}
      >
        {t("common.save")}
      </Button>
    </section>
  );
}

export function DataExport() {
  const { t } = useI18n();
  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-base font-bold">{t("privacy.exportTitle")}</h2>
      <p className="text-sm text-fg-muted">{t("privacy.exportText")}</p>
      {/* Plain GET download; the session cookie authenticates it and the endpoint is rate-limited. */}
      <a href="/api/v1/account/privacy" download className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-muted">
        <Download className="h-4 w-4" /> {t("privacy.exportButton")}
      </a>
    </section>
  );
}

export function DeleteAccount() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <section className="card space-y-3 border-berry-100 p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-berry-700">
        <AlertTriangle className="h-4 w-4" aria-hidden /> {t("privacy.deleteTitle")}
      </h2>
      <p className="text-sm text-fg-muted">{t("privacy.deleteText")}</p>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t("privacy.deleteButton")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("privacy.deleteTitle")}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => api("/account/privacy", { method: "DELETE", body: form }))) {
              router.replace("/?deleted=1");
              router.refresh();
            }
          }}
        >
          <p className="text-sm text-fg-muted">{t("privacy.deleteConfirmText")}</p>
          <FormError message={error} />
          <Field label={t("auth.password")} error={fields.password}>
            {(p) => <Input {...p} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />}
          </Field>
          <Field label={t("privacy.typeDelete")} error={fields.confirm}>
            {(p) => <Input {...p} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="DELETE" required />}
          </Field>
          <Button type="submit" variant="danger" className="w-full" loading={loading} disabled={form.confirm !== "DELETE"}>
            {t("privacy.deleteForever")}
          </Button>
        </form>
      </Dialog>
    </section>
  );
}
