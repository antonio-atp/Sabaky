import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { listAddresses } from "@/server/services/account";
import { AddressBook } from "@/components/account/address-book";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.addresses"), robots: { index: false } };
}

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const { t } = await getI18n();
  const addresses = await listAddresses(user.id);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.addresses")}</h1>
      <AddressBook
        addresses={addresses.map((a) => ({
          id: a.id,
          isDefault: a.isDefault,
          label: a.label ?? "",
          fullName: a.fullName,
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city,
          region: a.region ?? "",
          postalCode: a.postalCode,
          countryCode: a.countryCode,
          phone: a.phone ?? "",
        }))}
      />
    </div>
  );
}
