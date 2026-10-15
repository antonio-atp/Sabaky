import "server-only";
import { db } from "../db";
import { defineJob } from "../jobs/queue";
import { email } from "../integrations/email";
import { templates } from "../integrations/email/templates";
import { translatorFor } from "@/i18n/server";
import type { NotificationChannel, NotificationType, Prisma } from "@/generated/prisma/client";

/**
 * Notification fan-out: persists an in-app notification, then delivers to
 * the other channels the user has enabled. Channels are adapters, so push
 * (APNs / FCM via the native apps) plugs in without touching callers.
 *
 * Transactional types (orders, payments, security) are always emailed —
 * users can only opt out of marketing-style notifications (ePrivacy rules).
 */
const TRANSACTIONAL: NotificationType[] = [
  "ORDER_CONFIRMATION",
  "PAYMENT_CONFIRMATION",
  "SHIPPING_UPDATE",
  "DELIVERY_UPDATE",
  "REFUND_UPDATE",
  "SECURITY_ALERT",
];

export const MARKETING_TYPES: NotificationType[] = ["PROMOTION", "PRICE_DROP", "WISHLIST_UPDATE"];

export interface PushProvider {
  send(userId: string, title: string, body: string, href?: string | null): Promise<void>;
}
/** No-op until the native apps register device tokens. */
const push: PushProvider = { async send() {} };

interface NotifyInput {
  type: NotificationType;
  /** i18n key under `notifications.*` + variables — rendered in the user's language. */
  key: string;
  vars?: Record<string, string | number>;
  href?: string | null;
  data?: Prisma.InputJsonValue;
}

const deliver = defineJob<{ notificationId: string; channels: NotificationChannel[] }>(
  "notification.deliver",
  async ({ notificationId, channels }) => {
    const n = await db.notification.findUnique({
      where: { id: notificationId },
      include: { user: { select: { email: true, status: true } } },
    });
    if (!n || n.user.status !== "ACTIVE") return;
    if (channels.includes("EMAIL")) await email().send(templates.notification(n.user.email, n.title, n.body, n.href));
    if (channels.includes("PUSH")) await push.send(n.userId, n.title, n.body, n.href);
  },
);

export async function notify(userId: string, input: NotifyInput) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { locale: true, status: true, notificationPrefs: { where: { type: input.type } } },
  });
  if (!user || user.status === "DELETED") return;

  const t = await translatorFor(user.locale);
  const notification = await db.notification.create({
    data: {
      userId,
      type: input.type,
      title: t(`notifications.${input.key}.title`, input.vars),
      body: t(`notifications.${input.key}.body`, input.vars),
      href: input.href ?? null,
      data: input.data ?? {},
    },
  });

  const pref = (channel: NotificationChannel) => user.notificationPrefs.find((p) => p.channel === channel)?.enabled;
  const channels: NotificationChannel[] = [];
  const emailDefault = !MARKETING_TYPES.includes(input.type); // marketing is opt-in
  if (TRANSACTIONAL.includes(input.type) || (pref("EMAIL") ?? emailDefault)) channels.push("EMAIL");
  if (pref("PUSH") ?? false) channels.push("PUSH");
  if (channels.length) deliver.enqueue({ notificationId: notification.id, channels });
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}
