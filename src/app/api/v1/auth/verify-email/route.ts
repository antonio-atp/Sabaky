import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { verifyEmailSchema } from "@/shared/validation";
import { resendVerification, verifyEmail } from "@/server/services/auth";

export const POST = api({ body: verifyEmailSchema, rateLimit: RATE_LIMITS.passwordReset }, async ({ body }) => {
  await verifyEmail(body.token);
  return { ok: true };
});

/** Re-send the verification email to the signed-in user. */
export const PUT = api({ auth: "user", rateLimit: RATE_LIMITS.passwordReset }, async ({ user }) => {
  await resendVerification(user.id);
  return { ok: true };
});
