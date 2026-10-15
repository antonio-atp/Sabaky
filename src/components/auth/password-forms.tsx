"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { loading, error, fields, run } = useFormSubmit();

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center">
        <MailCheck className="h-12 w-12 text-brand-600" aria-hidden />
        <p className="mt-3 text-sm text-fg-muted">{t("auth.resetSent")}</p>
        <ButtonLink href="/login" variant="secondary" className="mt-5">
          {t("auth.backToSignIn")}
        </ButtonLink>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api("/auth/forgot-password", { body: { email } }))) setSent(true);
      }}
    >
      <FormError message={error} />
      <Field label={t("auth.email")} error={fields.email}>
        {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {t("auth.sendResetLink")}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { loading, error, fields, run, setFields } = useFormSubmit();

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== confirm) return setFields({ confirm: "validation.passwordMismatch" });
        if (await run(() => api("/auth/reset-password", { body: { token, password } }))) router.replace("/login?reset=1");
      }}
    >
      <FormError message={error} />
      <Field label={t("auth.newPassword")} error={fields.password} hint={t("auth.passwordHint")}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
      </Field>
      <Field label={t("auth.confirmPassword")} error={fields.confirm}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {t("auth.setPassword")}
      </Button>
    </form>
  );
}

export function VerifyEmail({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    api("/auth/verify-email", { body: { token } })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="flex flex-col items-center text-center">
      {state === "loading" && <p className="text-sm text-fg-muted">{t("auth.verifying")}</p>}
      {state === "ok" && (
        <>
          <CheckCircle2 className="h-12 w-12 text-brand-600" aria-hidden />
          <p className="mt-3 font-semibold">{t("auth.verified")}</p>
          <ButtonLink href="/" className="mt-5">
            {t("home.shopNow")}
          </ButtonLink>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="h-12 w-12 text-berry-600" aria-hidden />
          <p className="mt-3 text-sm text-fg-muted">{t("errors.TOKEN_INVALID")}</p>
          <Link href="/account" className="mt-4 text-sm font-semibold text-brand-700 hover:underline">
            {t("auth.resendFromAccount")}
          </Link>
        </>
      )}
    </div>
  );
}
