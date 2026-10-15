import { cookies } from "next/headers";
import { api } from "@/server/http/api";
import { consentSchema } from "@/shared/validation";
import { COOKIE } from "@/lib/cookies";
import { recordConsent } from "@/server/services/account";
import { randomToken } from "@/server/security/crypto";

/** Records cookie consent in the ledger and mirrors it in a cookie for the client. */
export const POST = api({ body: consentSchema }, async ({ body, user }) => {
  const jar = await cookies();
  const subjectId = user ? undefined : randomToken(12); // pseudonymous proof of consent for guests
  await recordConsent(user?.id ?? null, { "cookies.analytics": body.analytics, "cookies.marketing": body.marketing, "cookies.personalization": body.personalization }, subjectId);
  jar.set(COOKIE.consent, [body.analytics ? "a" : "", body.marketing ? "m" : "", body.personalization ? "p" : ""].join("") || "none", {
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // re-ask after 6 months
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return { ok: true };
});
