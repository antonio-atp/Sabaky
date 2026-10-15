import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getCart } from "@/server/services/cart";
import { getProfile, listAddresses } from "@/server/services/account";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { env } from "@/server/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("checkout.title"), robots: { index: false } };
}

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const { country } = await getI18n();
  const [cart, profile, addresses] = await Promise.all([getCart({ userId: user.id, guestToken: null }, { country }), getProfile(user.id), listAddresses(user.id)]);
  if (!cart.lines.length) redirect("/cart");

  return (
    <CheckoutFlow
      initialCart={cart}
      testMode={env().PAYMENT_PROVIDER === "mock"}
      contact={{ email: profile.email, fullName: profile.name, phone: profile.phone ?? "" }}
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        fullName: a.fullName,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        region: a.region,
        postalCode: a.postalCode,
        countryCode: a.countryCode,
        phone: a.phone,
        isDefault: a.isDefault,
      }))}
    />
  );
}
