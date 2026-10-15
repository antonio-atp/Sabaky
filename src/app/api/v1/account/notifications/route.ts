import { z } from "zod";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { notificationPrefsSchema } from "@/shared/validation";
import { listNotifications, markNotificationsRead, setNotificationPrefs } from "@/server/services/account";

export const GET = api({ auth: "user" }, async ({ user }) => listNotifications(user.id));

/** Mark notifications as read (all, or the given ids). */
export const PATCH = api({ auth: "user", body: z.object({ ids: z.array(z.string().max(40)).max(100).optional() }), rateLimit: RATE_LIMITS.write }, async ({ user, body }) => {
  await markNotificationsRead(user.id, body.ids);
  return { ok: true };
});

/** Replace channel preferences. */
export const PUT = api({ auth: "user", body: notificationPrefsSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body }) => {
  await setNotificationPrefs(user.id, body.preferences);
  return { ok: true };
});
