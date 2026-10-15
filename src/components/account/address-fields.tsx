"use client";

import { useI18n } from "@/i18n/client";
import { COUNTRY_CODES, COUNTRIES } from "@/shared/config/countries";
import { Field, Input, Select } from "@/components/ui/form";

export interface AddressDraft {
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  phone: string;
}

export const emptyAddress = (countryCode = "PT", fullName = ""): AddressDraft => ({
  label: "",
  fullName,
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  countryCode,
  phone: "",
});

/** Reusable, autocomplete-annotated address fields (checkout + account). */
export function AddressFields({
  value,
  onChange,
  errors = {},
  prefix = "",
  showLabel = true,
}: {
  value: AddressDraft;
  onChange: (v: AddressDraft) => void;
  errors?: Record<string, string>;
  prefix?: string;
  showLabel?: boolean;
}) {
  const { t } = useI18n();
  const set = (k: keyof AddressDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const err = (k: string) => errors[`${prefix}${k}`];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("address.fullName")} error={err("fullName")} required className="sm:col-span-2">
        {(p) => <Input {...p} autoComplete="shipping name" value={value.fullName} onChange={set("fullName")} required />}
      </Field>
      <Field label={t("address.line1")} error={err("line1")} required className="sm:col-span-2">
        {(p) => <Input {...p} autoComplete="shipping address-line1" value={value.line1} onChange={set("line1")} required />}
      </Field>
      <Field label={t("address.line2")} error={err("line2")} className="sm:col-span-2">
        {(p) => <Input {...p} autoComplete="shipping address-line2" value={value.line2} onChange={set("line2")} />}
      </Field>
      <Field label={t("address.postalCode")} error={err("postalCode")} required>
        {(p) => <Input {...p} autoComplete="shipping postal-code" value={value.postalCode} onChange={set("postalCode")} required />}
      </Field>
      <Field label={t("address.city")} error={err("city")} required>
        {(p) => <Input {...p} autoComplete="shipping address-level2" value={value.city} onChange={set("city")} required />}
      </Field>
      <Field label={t("address.region")} error={err("region")}>
        {(p) => <Input {...p} autoComplete="shipping address-level1" value={value.region} onChange={set("region")} />}
      </Field>
      <Field label={t("address.country")} error={err("countryCode")} required>
        {(p) => (
          <Select {...p} autoComplete="shipping country" value={value.countryCode} onChange={set("countryCode")}>
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>
                {COUNTRIES[c].name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("address.phone")} error={err("phone")} hint={t("address.phoneHint")}>
        {(p) => <Input {...p} type="tel" autoComplete="shipping tel" value={value.phone} onChange={set("phone")} />}
      </Field>
      {showLabel && (
        <Field label={t("address.label")} error={err("label")}>
          {(p) => <Input {...p} value={value.label} onChange={set("label")} placeholder={t("address.labelPlaceholder")} />}
        </Field>
      )}
    </div>
  );
}
