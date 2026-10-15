import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { registerSchema } from "@/shared/validation";
import { register } from "@/server/services/auth";
import { guestCartToken, issueSession } from "@/server/http/session-response";
import { getPreferences } from "@/i18n/server";

export const POST = api({ body: registerSchema, rateLimit: RATE_LIMITS.register }, async ({ req, body, ipHash }) => {
  const { locale } = await getPreferences();
  const { user, session } = await register(body, {
    ipHash,
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? "",
    locale,
    guestCartToken: await guestCartToken(),
  });
  return issueSession(req, session, { id: user.id, name: user.name, email: user.email });
});
