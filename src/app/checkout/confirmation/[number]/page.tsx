import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, CheckCircle2, Mail, Package } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getOrderForUser } from "@/server/services/orders";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("confirmation.title"), robots: { index: false } };
}

/** Step 6: order confirmation. */
export default async function ConfirmationPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/checkout/confirmation/${number}`);
  const order = await getOrderForUser(user.id, number);
  if (!order) notFound();
  const { t, price, date } = await getI18n();
  const payment = order.payments[0];
  const awaitingTransfer = payment?.method === "BANK_TRANSFER" && order.status === "PENDING_PAYMENT";

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-4">
      <div className="card p-6 text-center sm:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-9 w-9 text-brand-600" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{awaitingTransfer ? t("confirmation.pendingTitle") : t("confirmation.title")}</h1>
        <p className="mt-2 text-sm text-fg-muted">{t("confirmation.subtitle", { email: order.email })}</p>
        <p className="mt-4 inline-flex rounded-xl bg-surface-muted px-4 py-2 font-mono text-sm font-semibold">{order.number}</p>
      </div>

      {awaitingTransfer && (
        <div className="card space-y-2 p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Building2 className="h-4 w-4 text-brand-600" aria-hidden /> {t("confirmation.bankTitle")}
          </p>
          <p className="text-fg-muted">{t("confirmation.bankText", { amount: price(order.total), reference: order.number })}</p>
        </div>
      )}

      <div className="card divide-y divide-line">
        <div className="flex items-center gap-3 p-5 text-sm">
          <Package className="h-5 w-5 text-brand-600" aria-hidden />
          <span className="flex-1">{t("confirmation.eta")}</span>
          <span className="font-semibold">{order.estimatedDeliveryAt ? date(order.estimatedDeliveryAt, { weekday: "short", day: "numeric", month: "long" }) : "—"}</span>
        </div>
        <div className="flex items-center gap-3 p-5 text-sm">
          <Mail className="h-5 w-5 text-brand-600" aria-hidden />
          <span className="flex-1">{t("confirmation.total")}</span>
          <span className="font-semibold tabular">{price(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={`/account/orders/${order.number}`} className="flex-1">
          {t("confirmation.track")}
        </ButtonLink>
        <ButtonLink href="/" variant="outline" className="flex-1">
          {t("cart.continueShopping")}
        </ButtonLink>
      </div>
    </div>
  );
}
