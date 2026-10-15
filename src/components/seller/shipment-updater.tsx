"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { FormError, Input, Select } from "@/components/ui/form";
import { CARRIERS } from "@/shared/constants";

const FLOW = ["PENDING", "LABEL_CREATED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

/** Advance a shipment one or more steps (never backwards — enforced server-side too). */
export function ShipmentUpdater({ id, status, carrier, trackingNumber }: { id: string; status: string; carrier: string | null; trackingNumber: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const nextOptions = FLOW.slice(FLOW.indexOf(status as (typeof FLOW)[number]) + 1);
  const [form, setForm] = useState<{ status: string; carrier: string; trackingNumber: string; location: string }>({ status: nextOptions[0] ?? "", carrier: carrier ?? CARRIERS[0], trackingNumber: trackingNumber ?? "", location: "" });
  const { loading, error, fields, run } = useFormSubmit();
  if (!nextOptions.length) return null;

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() =>
          api(`/seller/shipments/${id}`, { method: "PATCH", body: { status: form.status, carrier: form.carrier, trackingNumber: form.trackingNumber || null, location: form.location || null } }),
        );
        if (ok) {
          toast("success", "common.saved");
          router.refresh();
        }
      }}
    >
      <FormError message={error} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} aria-label={t("seller.table.status")} className="h-10">
          {nextOptions.map((s) => (
            <option key={s} value={s}>
              {t(`shipmentStatus.${s}`)}
            </option>
          ))}
        </Select>
        <Select value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} aria-label={t("seller.carrier")} className="h-10">
          {CARRIERS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Input value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} placeholder={t("seller.trackingNumber")} aria-label={t("seller.trackingNumber")} invalid={!!fields.trackingNumber} className="h-10" />
        <Button type="submit" loading={loading} className="h-10">
          {t("seller.update")}
        </Button>
      </div>
      {fields.trackingNumber && <p className="text-xs text-berry-600">{t(fields.trackingNumber)}</p>}
    </form>
  );
}
