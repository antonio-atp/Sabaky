"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

export function RegisterForm({ next }: { next: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", acceptTerms: false, marketingOptIn: false });
  const { loading, error, fields, run } = useFormSubmit();
  const score = useMemo(() => strength(form.password), [form.password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(() => api("/auth/register", { body: form }));
    if (ok) {
      router.replace(next === "/" ? "/account?welcome=1" : next);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Field label={t("auth.name")} error={fields.name} required>
        {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
      </Field>
      <Field label={t("auth.email")} error={fields.email} required>
        {(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />}
      </Field>
      <Field label={t("auth.password")} error={fields.password} hint={t("auth.passwordHint")} required>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={10} />}
      </Field>
      {form.password && (
        <div aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < score ? (score <= 1 ? "bg-berry-500" : score <= 2 ? "bg-sunrise-400" : "bg-brand-500") : "bg-surface-sunken")} />
            ))}
          </div>
          <p className="mt-1 text-xs text-fg-subtle">{t(`auth.strength.${score}`)}</p>
        </div>
      )}
      <Checkbox
        checked={form.acceptTerms}
        onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
        label={
          <>
            {t("auth.acceptTermsPrefix")}{" "}
            <Link href="/legal/terms" target="_blank" className="font-medium text-brand-700 underline">
              {t("footer.terms")}
            </Link>{" "}
            {t("common.and")}{" "}
            <Link href="/legal/privacy" target="_blank" className="font-medium text-brand-700 underline">
              {t("footer.privacy")}
            </Link>
          </>
        }
      />
      {fields.acceptTerms && <p className="text-xs text-berry-600">{t(fields.acceptTerms)}</p>}
      <Checkbox checked={form.marketingOptIn} onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })} label={t("auth.marketingOptIn")} />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {t("auth.createAccount")}
      </Button>
    </form>
  );
}
