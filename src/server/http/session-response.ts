import "server-only";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { setSessionCookie } from "../auth/session";
import { COOKIE } from "@/lib/cookies";

/**
 * Native apps identify themselves with `X-Sabaky-Client: native` and receive
 * the session token in the body (stored in Keychain / Keystore) instead of a cookie.
 */
export const isNativeClient = (req: NextRequest) => req.headers.get("x-sabaky-client") === "native";

export async function issueSession(req: NextRequest, session: { token: string; expiresAt: Date }, user: { id: string; name: string; email: string }) {
  // The guest cart has been merged into the account; drop the guest token.
  (await cookies()).delete(COOKIE.cart);
  if (isNativeClient(req)) {
    return { user, token: session.token, expiresAt: session.expiresAt.toISOString() };
  }
  await setSessionCookie(session.token, session.expiresAt);
  return { user };
}

export async function guestCartToken() {
  return (await cookies()).get(COOKIE.cart)?.value;
}

export async function setGuestCartCookie(token: string) {
  (await cookies()).set(COOKIE.cart, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
