"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { COUNTRY_CODES, COUNTRIES } from "@/shared/config/countries";

const toSlug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export function SellerRegisterForm({ email, emailVerified }: { email: string; emailVerified: boolean }) {
  const { t, country } = useI18n();
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState({
    storeName: "",
    slug: "",
    description: "",
    countryCode: country as string,
    supportEmail: email,
    legalName: "",
    businessType: "company",
    registrationNumber: "",
    vatNumber: "",
    acceptSellerTerms: false,
  });
  const { loading, error, fields, run } = useFormSubmit();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api("/seller/register", { body: form }))) {
          router.replace("/seller?welcome=1");
          router.refresh();
        }
      }}
    >
      <FormError message={error ?? (!emailVerified ? "errors.EMAIL_NOT_VERIFIED" : null)} />
      <section className="card space-y-4 p-5">
        <h2 className="text-base font-bold">{t("sellerRegister.store")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("sellerRegister.storeName")} error={fields.storeName} required>
            {(p) => (
              <Input
                {...p}
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value, slug: slugEdited ? form.slug : toSlug(e.target.value) })}
              />
            )}
          </Field>
          <Field label={t("sellerRegister.slug")} error={fields.slug} hint={`sabaky.com/store/${form.slug || "…"}`} required>
            {(p) => (
              <Input
                {...p}
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setForm({ ...form, slug: toSlug(e.target.value) });
                }}
              />
            )}
          </Field>
          <Field label={t("sellerRegister.description")} error={fields.description} className="sm:col-span-2">
            {(p) => <Textarea {...p} value={form.description} onChange={set("description")} rows={3} maxLength={1000} />}
          </Field>
          <Field label={t("sellerRegister.supportEmail")} error={fields.supportEmail} required>
            {(p) => <Input {...p} type="email" value={form.supportEmail} onChange={set("supportEmail")} />}
          </Field>
          <Field label={t("address.country")} error={fields.countryCode} required>
            {(p) => (
              <Select {...p} value={form.countryCode} onChange={set("countryCode")}>
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {COUNTRIES[c].name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-base font-bold">{t("sellerRegister.verification")}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t("sellerRegister.verificationHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("sellerRegister.businessType")}>
            {(p) => (
              <Select {...p} value={form.businessType} onChange={set("businessType")}>
                <option value="company">{t("sellerRegister.company")}</option>
                <option value="individual">{t("sellerRegister.individual")}</option>
              </Select>
            )}
          </Field>
          <Field label={t("sellerRegister.legalName")} error={fields.legalName} required>
            {(p) => <Input {...p} value={form.legalName} onChange={set("legalName")} />}
          </Field>
          <Field label={t("sellerRegister.registrationNumber")} error={fields.registrationNumber} required>
            {(p) => <Input {...p} value={form.registrationNumber} onChange={set("registrationNumber")} />}
          </Field>
          <Field label={t("sellerRegister.vatNumber")} error={fields.vatNumber}>
            {(p) => <Input {...p} value={form.vatNumber} onChange={set("vatNumber")} />}
          </Field>
        </div>
        <p className="text-xs text-fg-subtle">{t("sellerRegister.encryptedNote")}</p>
      </section>

      <Checkbox
        checked={form.acceptSellerTerms}
        onChange={(e) => setForm({ ...form, acceptSellerTerms: e.target.checked })}
        label={
          <>
            {t("auth.acceptTermsPrefix")}{" "}
            <Link href="/legal/seller-terms" target="_blank" className="font-medium text-brand-700 underline">
              {t("footer.sellerTerms")}
            </Link>
          </>
        }
      />
      {fields.acceptSellerTerms && <p className="text-xs text-berry-600">{t(fields.acceptSellerTerms)}</p>}
      <Button type="submit" size="lg" loading={loading} disabled={!emailVerified}>
        {t("sellerRegister.submit")}
      </Button>
    </form>
  );
}
