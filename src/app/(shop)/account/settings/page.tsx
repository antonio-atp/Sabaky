import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getProfile, listSessions } from "@/server/services/account";
import { ChangePasswordForm, ProfileForm, SessionList } from "@/components/account/settings-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.settings"), robots: { index: false } };
}

export default async function SettingsPage() {
  const user = await requireUser("/account/settings");
  const { t } = await getI18n();
  const [profile, sessions] = await Promise.all([getProfile(user.id), listSessions(user.id)]);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.settings")}</h1>
      <ProfileForm
        initial={{ name: profile.name, email: profile.email, phone: profile.phone ?? "", locale: profile.locale, currency: profile.currency, countryCode: profile.countryCode ?? "" }}
      />
      <ChangePasswordForm />
      <SessionList
        currentId={user.sessionId}
        sessions={sessions.map((s) => ({ id: s.id, userAgent: s.userAgent, lastUsedAt: s.lastUsedAt.toISOString(), createdAt: s.createdAt.toISOString() }))}
      />
    </div>
  );
}
