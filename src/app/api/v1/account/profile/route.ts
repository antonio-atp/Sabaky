import { cookies } from "next/headers";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { profileSchema } from "@/shared/validation";
import { getProfile, updateProfile } from "@/server/services/account";
import { COOKIE } from "@/lib/cookies";

export const GET = api({ auth: "user" }, async ({ user }) => getProfile(user.id));

export const PATCH = api({ auth: "user", body: profileSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body }) => {
  await updateProfile(user.id, body);
  // Keep display preferences in sync with the profile.
  const jar = await cookies();
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
  jar.set(COOKIE.locale, body.locale, opts);
  jar.set(COOKIE.currency, body.currency, opts);
  return { ok: true };
});
