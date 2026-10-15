import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "@/lib/cookies";

/**
 * Edge of the application (Next.js 16 "proxy", formerly middleware):
 *  • Per-request CSP nonce → strict script policy (no inline script injection).
 *  • Issues the double-submit CSRF cookie.
 *  • Fast, optimistic redirect for protected areas when no session cookie is
 *    present. This is UX only — every page and API re-validates the session
 *    and role on the server.
 */
const PROTECTED = ["/account", "/checkout", "/seller", "/admin"];

function buildCsp(nonce: string, isDev: boolean) {
  const cdn = process.env.NEXT_PUBLIC_CDN_URL ?? "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React style attributes need inline styles; style injection is low-risk compared to scripts.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' blob: data: ${cdn}`.trim(),
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    // Payment provider iframes (Stripe Elements) are allowed explicitly.
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (!isApi && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.has(COOKIE.session)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const isDev = process.env.NODE_ENV === "development";
  const requestHeaders = new Headers(request.headers);
  let csp: string;
  if (isApi) {
    csp = "default-src 'none'; frame-ancestors 'none'";
  } else {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    csp = buildCsp(nonce, isDev);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  if (!request.cookies.has(COOKIE.csrf)) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Buffer.from(bytes).toString("base64url");
    response.cookies.set(COOKIE.csrf, token, {
      httpOnly: false, // must be readable by our JS to echo it in the header
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|demo-media).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
