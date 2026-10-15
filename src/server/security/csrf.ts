import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "../http/errors";
import { safeEqual } from "./crypto";
import { COOKIE, CSRF_HEADER } from "@/lib/cookies";
import { env } from "../env";

/**
 * CSRF defence in depth for cookie-authenticated requests:
 *  1. SameSite=Lax session cookie (browser-enforced).
 *  2. Origin / Referer must match our own origin.
 *  3. Double-submit token: header `x-csrf-token` must equal the CSRF cookie
 *     (issued by the proxy). Cross-site pages can neither read the cookie nor
 *     set custom headers without a CORS preflight, which we never allow.
 * Bearer-token clients (native apps) are not exposed to CSRF and skip this.
 */
export function verifyCsrf(req: NextRequest) {
  const allowed = new Set([req.nextUrl.origin, new URL(env().APP_URL).origin]);
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const source = origin ?? (referer ? safeOrigin(referer) : null);
  if (!source || !allowed.has(source)) throw new AppError("CSRF_FAILED");

  const cookieToken = req.cookies.get(COOKIE.csrf)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) throw new AppError("CSRF_FAILED");
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
