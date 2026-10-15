import { NextResponse } from "next/server";
import { api } from "@/server/http/api";
import { consentSchema, deleteAccountSchema } from "@/shared/validation";
import { deleteAccount, exportUserData, recordConsent, setNotificationPrefs } from "@/server/services/account";
import { MARKETING_TYPES } from "@/server/services/notifications";
import { clearSessionCookie } from "@/server/auth/session";

const exportLimit = { name: "export", limit: 3, windowMs: 60 * 60_000 };

/** GDPR Art. 15 / 20 — download a copy of personal data. */
export const GET = api({ auth: "user", rateLimit: exportLimit }, async ({ user, ipHash }) => {
  const data = await exportUserData(user.id, ipHash);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sabaky-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});

/** Update marketing / personalisation consents from the privacy centre. */
export const PATCH = api({ auth: "user", body: consentSchema }, async ({ user, body }) => {
  await recordConsent(user.id, { analytics: body.analytics, marketing: body.marketing, personalization: body.personalization });
  // Marketing consent governs marketing emails — keep channel preferences in lockstep.
  await setNotificationPrefs(
    user.id,
    MARKETING_TYPES.map((type) => ({ type, channel: "EMAIL" as const, enabled: body.marketing })),
  );
  return { ok: true };
});

/** GDPR Art. 17 — erase account (password re-authentication required). */
export const DELETE = api({ auth: "user", body: deleteAccountSchema, rateLimit: exportLimit }, async ({ user, body, ipHash }) => {
  await deleteAccount(user.id, body.password, ipHash);
  await clearSessionCookie();
  return { ok: true };
});
