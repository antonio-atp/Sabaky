"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/form";

export function BannerForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [f, setF] = useState({ title: "", subtitle: "", ctaLabel: "", href: "/deals", theme: "brand" });
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api("/admin/banners", { body: { ...f, subtitle: f.subtitle || null, ctaLabel: f.ctaLabel || null, isActive: true } }))) {
          setF({ ...f, title: "", subtitle: "" });
          router.refresh();
        }
      }}
    >
      <h2 className="text-base font-bold">{t("admin.newBanner")}</h2>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.bannerTitle")} error={fields.title}>
          {(p) => <Input {...p} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
        </Field>
        <Field label={t("admin.bannerSubtitle")} error={fields.subtitle}>
          {(p) => <Input {...p} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />}
        </Field>
        <Field label={t("admin.bannerCta")} error={fields.ctaLabel}>
          {(p) => <Input {...p} value={f.ctaLabel} onChange={(e) => setF({ ...f, ctaLabel: e.target.value })} />}
        </Field>
        <Field label={t("admin.bannerLink")} error={fields.href} hint={t("admin.bannerLinkHint")}>
          {(p) => <Input {...p} value={f.href} onChange={(e) => setF({ ...f, href: e.target.value })} />}
        </Field>
        <Field label={t("admin.bannerTheme")}>
          {(p) => (
            <Select {...p} value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })}>
              {["brand", "sunrise", "ink", "berry"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Button type="submit" loading={loading}>
        {t("admin.createBanner")}
      </Button>
    </form>
  );
}
