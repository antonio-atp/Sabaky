import type { Metadata } from "next";
import { CreditCard, Lock } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { listPaymentMethods } from "@/server/services/account";
import { EmptyState, Badge } from "@/components/ui/misc";
import { RemovePaymentMethod } from "@/components/account/remove-payment-method";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.payments"), robots: { index: false } };
}

export default async function PaymentMethodsPage() {
  const user = await requireUser("/account/payment-methods");
  const { t } = await getI18n();
  const methods = await listPaymentMethods(user.id);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.payments")}</h1>
      <div className="flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
        <Lock className="h-5 w-5 shrink-0" aria-hidden />
        <p>{t("payments.securityNote")}</p>
      </div>
      {methods.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {methods.map((m) => (
            <li key={m.id} className="card flex items-center gap-4 p-5">
              <span className="grid h-10 w-14 place-items-center rounded-lg bg-ink-900 text-white">
                <CreditCard className="h-5 w-5" aria-hidden />
              </span>
              <div className="flex-1 text-sm">
                <p className="font-semibold">
                  {m.brand ?? t(`checkout.payment.${m.type}`)} {m.last4 && `•••• ${m.last4}`}
                </p>
                {m.expMonth && m.expYear && <p className="text-xs text-fg-muted">{t("payments.expires", { date: `${String(m.expMonth).padStart(2, "0")}/${m.expYear}` })}</p>}
                {m.isDefault && <Badge tone="brand" className="mt-1">{t("address.default")}</Badge>}
              </div>
              <RemovePaymentMethod id={m.id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<CreditCard className="h-6 w-6" />} title={t("payments.none")} description={t("payments.noneHint")} />
      )}
    </div>
  );
}
