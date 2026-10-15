import { cookies } from "next/headers";
import { api } from "@/server/http/api";
import { preferencesSchema } from "@/shared/validation";
import { COOKIE } from "@/lib/cookies";
import { db } from "@/server/db";

const YEAR = 60 * 60 * 24 * 365;

/** Language / currency / delivery-country. Strictly-necessary functional cookies. */
export const POST = api({ body: preferencesSchema }, async ({ body, user }) => {
  const jar = await cookies();
  const opts = { path: "/", maxAge: YEAR, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
  if (body.locale) jar.set(COOKIE.locale, body.locale, opts);
  if (body.currency) jar.set(COOKIE.currency, body.currency, opts);
  if (body.country) jar.set(COOKIE.country, body.country, opts);
  if (user && (body.locale || body.currency)) {
    await db.user.update({ where: { id: user.id }, data: { ...(body.locale ? { locale: body.locale } : {}), ...(body.currency ? { currency: body.currency } : {}) } });
  }
  return { ok: true };
});
