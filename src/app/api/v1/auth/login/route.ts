import { api } from "@/server/http/api";
import { RATE_LIMITS, rateLimit } from "@/server/security/rate-limit";
import { AppError } from "@/server/http/errors";
import { hmac } from "@/server/security/crypto";
import { loginSchema } from "@/shared/validation";
import { login } from "@/server/services/auth";
import { guestCartToken, issueSession } from "@/server/http/session-response";

export const POST = api({ body: loginSchema, rateLimit: RATE_LIMITS.login }, async ({ req, body, ipHash }) => {
  // Second limiter keyed on the target account: slows distributed guessing on one email.
  const perAccount = await rateLimit({ name: "login-account", limit: 20, windowMs: 15 * 60_000 }, hmac(body.email));
  if (!perAccount.ok) throw new AppError("RATE_LIMITED", "errors.RATE_LIMITED", undefined, { "Retry-After": String(perAccount.retryAfterSeconds) });

  const { user, session } = await login(body.email, body.password, {
    ipHash,
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? "",
    guestCartToken: await guestCartToken(),
  });
  return issueSession(req, session, { id: user.id, name: user.name, email: user.email });
});
