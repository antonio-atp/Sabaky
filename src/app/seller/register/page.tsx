import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgePercent, Globe2, ShieldCheck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getSellerForUser } from "@/server/services/seller";
import { SellerRegisterForm } from "@/components/seller/seller-register-form";
import { ResendVerification } from "@/components/account/resend-verification";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.sell") };
}

export default async function SellerRegisterPage() {
  const user = await requireUser("/seller/register");
  if (await getSellerForUser(user.id)) redirect("/seller");
  const { t } = await getI18n();
  const perks = [
    { icon: Globe2, title: t("sellerRegister.perk1"), text: t("sellerRegister.perk1Text") },
    { icon: BadgePercent, title: t("sellerRegister.perk2"), text: t("sellerRegister.perk2Text") },
    { icon: ShieldCheck, title: t("sellerRegister.perk3"), text: t("sellerRegister.perk3Text") },
  ];
  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("sellerRegister.title")}</h1>
          <p className="mt-2 text-fg-muted">{t("sellerRegister.subtitle")}</p>
        </div>
        {!user.emailVerified && <ResendVerification />}
        <SellerRegisterForm email={user.email} emailVerified={user.emailVerified} />
      </div>
      <aside className="space-y-3">
        {perks.map((p) => (
          <div key={p.title} className="card flex gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <p.icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-fg-muted">{p.text}</p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
