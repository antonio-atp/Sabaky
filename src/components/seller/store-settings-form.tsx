"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { parseMajorToMinor } from "@/shared/money";

export function StoreSettingsForm({ initial }: { initial: { storeName: string; description: string; supportEmail: string; freeShippingThreshold: string; handlingDays: string } }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() =>
          api("/seller/store", {
            method: "PATCH",
            body: {
              storeName: f.storeName,
              description: f.description || null,
              supportEmail: f.supportEmail,
              logoUrl: null,
              bannerUrl: null,
              freeShippingThreshold: f.freeShippingThreshold ? parseMajorToMinor(f.freeShippingThreshold) : null,
              handlingDays: Number(f.handlingDays),
            },
          }),
        );
        if (ok) {
          toast("success", "common.saved");
          router.refresh();
        }
      }}
    >
      <h2 className="text-base font-bold">{t("sellerSettings.store")}</h2>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("sellerRegister.storeName")} error={fields.storeName}>
          {(p) => <Input {...p} value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} />}
        </Field>
        <Field label={t("sellerRegister.supportEmail")} error={fields.supportEmail}>
          {(p) => <Input {...p} type="email" value={f.supportEmail} onChange={(e) => setF({ ...f, supportEmail: e.target.value })} />}
        </Field>
        <Field label={t("sellerRegister.description")} error={fields.description} className="sm:col-span-2">
          {(p) => <Textarea {...p} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} />}
        </Field>
        <Field label={t("sellerSettings.freeShippingThreshold")} hint={t("sellerSettings.freeShippingHint")} error={fields.freeShippingThreshold}>
          {(p) => <Input {...p} inputMode="decimal" value={f.freeShippingThreshold} onChange={(e) => setF({ ...f, freeShippingThreshold: e.target.value })} />}
        </Field>
        <Field label={t("sellerSettings.handlingDays")} error={fields.handlingDays}>
          {(p) => <Input {...p} inputMode="numeric" value={f.handlingDays} onChange={(e) => setF({ ...f, handlingDays: e.target.value.replace(/\D/g, "") })} />}
        </Field>
      </div>
      <Button type="submit" loading={loading}>
        {t("common.save")}
      </Button>
    </form>
  );
}

export function CouponForm({ endpoint }: { endpoint: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({ code: "", type: "PERCENT", value: "10", minSubtotal: "0", usageLimit: "" });
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const value = f.type === "PERCENT" ? Math.round(Number(f.value) * 100) : f.type === "FIXED" ? (parseMajorToMinor(f.value) ?? 0) : 0;
        const ok = await run(() =>
          api(endpoint, {
            body: { code: f.code, type: f.type, value, minSubtotal: parseMajorToMinor(f.minSubtotal || "0") ?? 0, usageLimit: f.usageLimit ? Number(f.usageLimit) : null, perUserLimit: 1 },
          }),
        );
        if (ok) {
          toast("success", "common.saved");
          setF({ ...f, code: "" });
          router.refresh();
        }
      }}
    >
      <h2 className="text-base font-bold">{t("coupons.create")}</h2>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-5">
        <Field label={t("coupons.code")} error={fields.code}>
          {(p) => <Input {...p} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} className="uppercase" />}
        </Field>
        <Field label={t("coupons.type")}>
          {(p) => (
            <Select {...p} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              {["PERCENT", "FIXED", "FREE_SHIPPING"].map((x) => (
                <option key={x} value={x}>
                  {t(`coupons.types.${x}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={f.type === "PERCENT" ? t("coupons.percent") : t("coupons.amount")} error={fields.value}>
          {(p) => <Input {...p} inputMode="decimal" value={f.value} disabled={f.type === "FREE_SHIPPING"} onChange={(e) => setF({ ...f, value: e.target.value })} />}
        </Field>
        <Field label={t("coupons.minSubtotal")} error={fields.minSubtotal}>
          {(p) => <Input {...p} inputMode="decimal" value={f.minSubtotal} onChange={(e) => setF({ ...f, minSubtotal: e.target.value })} />}
        </Field>
        <Field label={t("coupons.usageLimit")} error={fields.usageLimit}>
          {(p) => <Input {...p} inputMode="numeric" value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value.replace(/\D/g, "") })} />}
        </Field>
      </div>
      <Button type="submit" loading={loading}>
        {t("coupons.create")}
      </Button>
    </form>
  );
}
