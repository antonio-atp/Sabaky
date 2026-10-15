import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { changePasswordSchema } from "@/shared/validation";
import { changePassword } from "@/server/services/auth";

export const POST = api({ auth: "user", body: changePasswordSchema, rateLimit: RATE_LIMITS.passwordReset }, async ({ req, user, body, ipHash }) => {
  await changePassword(user.id, user.sessionId, body.currentPassword, body.newPassword, { ipHash, userAgent: req.headers.get("user-agent") ?? "" });
  return { ok: true };
});
