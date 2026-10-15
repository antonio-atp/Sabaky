import { api } from "@/server/http/api";
import { clearSessionCookie, revokeSession } from "@/server/auth/session";
import { audit } from "@/server/services/audit";

export const POST = api({}, async ({ user, ipHash }) => {
  if (user) {
    await revokeSession(user.sessionId);
    await audit("auth.logout", { type: "User", id: user.id }, { actorId: user.id, ipHash });
  }
  await clearSessionCookie();
  return { ok: true };
});
