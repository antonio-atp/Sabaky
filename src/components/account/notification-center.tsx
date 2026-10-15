"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationInbox({ items }: { items: Item[] }) {
  const { t, date } = useI18n();
  const router = useRouter();
  if (!items.length) return <EmptyState icon={<Bell className="h-6 w-6" />} title={t("notifications.none")} />;
  const unread = items.some((i) => !i.readAt);
  return (
    <div className="card overflow-hidden">
      {unread && (
        <div className="flex justify-end border-b border-line px-4 py-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await api("/account/notifications", { method: "PATCH", body: {} });
              router.refresh();
            }}
          >
            <CheckCheck className="h-4 w-4" /> {t("notifications.markAllRead")}
          </Button>
        </div>
      )}
      <ul className="divide-y divide-line">
        {items.map((n) => {
          const content = (
            <div className="flex gap-3 px-4 py-3.5">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-600")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
                <p className="text-sm text-fg-muted">{n.body}</p>
                <p className="mt-1 text-xs text-fg-subtle">{date(n.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
            </div>
          );
          return <li key={n.id}>{n.href ? <Link href={n.href} className="block hover:bg-surface-muted">{content}</Link> : content}</li>;
        })}
      </ul>
    </div>
  );
}

type Pref = { type: string; channel: string; enabled: boolean };
const TYPES = ["ORDER_CONFIRMATION", "SHIPPING_UPDATE", "DELIVERY_UPDATE", "REFUND_UPDATE", "PROMOTION", "PRICE_DROP", "WISHLIST_UPDATE", "SECURITY_ALERT"];
const TRANSACTIONAL = ["ORDER_CONFIRMATION", "SHIPPING_UPDATE", "DELIVERY_UPDATE", "REFUND_UPDATE", "SECURITY_ALERT"];
const MARKETING = ["PROMOTION", "PRICE_DROP", "WISHLIST_UPDATE"];

export function NotificationPreferences({ initial }: { initial: Pref[] }) {
  const { t } = useI18n();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Pref[]>(initial);
  const [saving, setSaving] = useState(false);

  const get = (type: string, channel: string) => {
    const p = prefs.find((x) => x.type === type && x.channel === channel);
    if (p) return p.enabled;
    if (channel === "EMAIL") return !MARKETING.includes(type);
    return channel === "IN_APP";
  };
  const set = (type: string, channel: string, enabled: boolean) =>
    setPrefs((all) => [...all.filter((x) => !(x.type === type && x.channel === channel)), { type, channel, enabled }]);

  return (
    <div className="card overflow-x-auto p-5">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs text-fg-subtle">
            <th className="pb-3 font-medium">{t("notifications.type")}</th>
            <th className="pb-3 text-center font-medium">{t("notifications.email")}</th>
            <th className="pb-3 text-center font-medium">{t("notifications.push")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {TYPES.map((type) => (
            <tr key={type}>
              <td className="py-2.5">
                {t(`notifications.types.${type}`)}
                {TRANSACTIONAL.includes(type) && <span className="block text-xs text-fg-subtle">{t("notifications.required")}</span>}
              </td>
              {["EMAIL", "PUSH"].map((channel) => (
                <td key={channel} className="text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    aria-label={`${t(`notifications.types.${type}`)} ${channel}`}
                    checked={channel === "EMAIL" && TRANSACTIONAL.includes(type) ? true : get(type, channel)}
                    disabled={channel === "EMAIL" && TRANSACTIONAL.includes(type)}
                    onChange={(e) => set(type, channel, e.target.checked)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-fg-subtle">{t("notifications.pushNote")}</p>
      <Button
        className="mt-4"
        loading={saving}
        onClick={async () => {
          setSaving(true);
          await api("/account/notifications", { method: "PUT", body: { preferences: prefs } }).catch(() => {});
          setSaving(false);
          toast("success", "common.saved");
        }}
      >
        {t("common.save")}
      </Button>
    </div>
  );
}
