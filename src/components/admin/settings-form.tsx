"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";

export function PlatformSettingsForm({ initial }: { initial: { requireProductApproval: boolean; defaultCommissionBps: number; maintenanceMode: boolean } }) {
  const { t } = useI18n();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  return (
    <div className="card space-y-4 p-5">
      <Checkbox checked={f.requireProductApproval} onChange={(e) => setF({ ...f, requireProductApproval: e.target.checked })} label={t("admin.settings.requireApproval")} />
      <Checkbox checked={f.maintenanceMode} onChange={(e) => setF({ ...f, maintenanceMode: e.target.checked })} label={t("admin.settings.maintenance")} />
      <Field label={t("admin.settings.commission")} hint={t("admin.settings.commissionHint")}>
        {(p) => <Input {...p} inputMode="decimal" value={String(f.defaultCommissionBps / 100)} onChange={(e) => setF({ ...f, defaultCommissionBps: Math.round(Number(e.target.value || 0) * 100) })} className="max-w-32" />}
      </Field>
      <Button
        loading={saving}
        onClick={async () => {
          setSaving(true);
          await api("/admin/settings", { method: "PATCH", body: f }).catch(() => {});
          setSaving(false);
          toast("success", "common.saved");
        }}
      >
        {t("common.save")}
      </Button>
    </div>
  );
}
