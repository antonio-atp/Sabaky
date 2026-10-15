"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, LogOut } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { LOCALES, LOCALE_LABELS } from "@/shared/config/locales";
import { CURRENCY_CODES } from "@/shared/config/currencies";
import { COUNTRY_CODES, COUNTRIES } from "@/shared/config/countries";

export function ProfileForm({ initial }: { initial: { name: string; phone: string; locale: string; currency: string; countryCode: string; email: string } }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => api("/account/profile", { method: "PATCH", body: { name: form.name, phone: form.phone || null, locale: form.locale, currency: form.currency, countryCode: form.countryCode || null } }));
        if (ok) {
          toast("success", "common.saved");
          router.refresh();
        }
      }}
    >
      <h2 className="text-base font-bold">{t("settings.profile")}</h2>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("auth.name")} error={fields.name}>
          {(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label={t("auth.email")} hint={t("settings.emailHint")}>
          {(p) => <Input {...p} value={form.email} disabled />}
        </Field>
        <Field label={t("address.phone")} error={fields.phone}>
          {(p) => <Input {...p} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
        </Field>
        <Field label={t("prefs.country")}>
          {(p) => (
            <Select {...p} value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })}>
              <option value="">—</option>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>
                  {COUNTRIES[c].name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("prefs.language")}>
          {(p) => (
            <Select {...p} value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l].native}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("prefs.currency")}>
          {(p) => (
            <Select {...p} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Button type="submit" loading={loading}>
        {t("common.save")}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api("/auth/change-password", { body: form }))) {
          setForm({ currentPassword: "", newPassword: "" });
          toast("success", "settings.passwordChanged");
        }
      }}
    >
      <h2 className="text-base font-bold">{t("settings.password")}</h2>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("settings.currentPassword")} error={fields.currentPassword}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />}
        </Field>
        <Field label={t("auth.newPassword")} error={fields.newPassword} hint={t("auth.passwordHint")}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />}
        </Field>
      </div>
      <p className="text-xs text-fg-subtle">{t("settings.passwordNote")}</p>
      <Button type="submit" loading={loading}>
        {t("settings.updatePassword")}
      </Button>
    </form>
  );
}

export function SessionList({ sessions, currentId }: { sessions: { id: string; userAgent: string | null; lastUsedAt: string; createdAt: string }[]; currentId: string }) {
  const { t, date } = useI18n();
  const router = useRouter();
  return (
    <div className="card p-5">
      <h2 className="text-base font-bold">{t("settings.sessions")}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t("settings.sessionsHint")}</p>
      <ul className="mt-4 divide-y divide-line">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
            <Laptop className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{describeAgent(s.userAgent) ?? t("settings.unknownDevice")}</p>
              <p className="text-xs text-fg-subtle">
                {t("settings.lastActive", { date: date(s.lastUsedAt, { dateStyle: "medium", timeStyle: "short" }) })}
                {s.id === currentId && <span className="ml-2 font-semibold text-brand-700">· {t("settings.thisDevice")}</span>}
              </p>
            </div>
            {s.id !== currentId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await api(`/account/sessions/${s.id}`, { method: "DELETE" }).catch(() => {});
                  router.refresh();
                }}
              >
                <LogOut className="h-3.5 w-3.5" /> {t("settings.signOutDevice")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` · ${os}` : ""}`;
}
