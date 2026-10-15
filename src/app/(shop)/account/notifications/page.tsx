import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getNotificationPrefs, listNotifications } from "@/server/services/account";
import { NotificationInbox, NotificationPreferences } from "@/components/account/notification-center";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.notifications"), robots: { index: false } };
}

export default async function NotificationsPage() {
  const user = await requireUser("/account/notifications");
  const { t } = await getI18n();
  const [items, prefs] = await Promise.all([listNotifications(user.id), getNotificationPrefs(user.id)]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.notifications")}</h1>
      <NotificationInbox
        items={items.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))}
      />
      <section>
        <h2 className="mb-3 text-lg font-bold">{t("notifications.preferences")}</h2>
        <NotificationPreferences initial={prefs.map((p) => ({ type: p.type, channel: p.channel, enabled: p.enabled }))} />
      </section>
    </div>
  );
}
