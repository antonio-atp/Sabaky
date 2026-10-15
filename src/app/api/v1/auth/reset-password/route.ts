import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { resetPasswordSchema } from "@/shared/validation";
import { resetPassword } from "@/server/services/auth";

export const POST = api({ body: resetPasswordSchema, rateLimit: RATE_LIMITS.passwordReset }, async ({ req, body, ipHash }) => {
  await resetPassword(body.token, body.password, { ipHash, userAgent: req.headers.get("user-agent") ?? "" });
  return { ok: true };
});
