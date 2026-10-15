import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { forgotPasswordSchema } from "@/shared/validation";
import { requestPasswordReset } from "@/server/services/auth";

/** Always 200 with the same body — never reveals whether an account exists. */
export const POST = api({ body: forgotPasswordSchema, rateLimit: RATE_LIMITS.passwordReset }, async ({ req, body, ipHash }) => {
  await requestPasswordReset(body.email, { ipHash, userAgent: req.headers.get("user-agent") ?? "" });
  return { ok: true };
});
