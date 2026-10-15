/**
 * Cookie names shared by proxy, server and client.
 * In production the `__Host-` prefix forces Secure + Path=/ + no Domain, which
 * blocks subdomain cookie injection / fixation.
 */
const prefix = process.env.NODE_ENV === "production" ? "__Host-" : "";

export const COOKIE = {
  session: `${prefix}sabaky.sid`,
  csrf: `${prefix}sabaky.csrf`,
  cart: `${prefix}sabaky.cart`,
  // Preference cookies are not security-sensitive and readable by the client.
  locale: "sabaky.locale",
  currency: "sabaky.currency",
  country: "sabaky.country",
  consent: "sabaky.consent",
} as const;

export const CSRF_HEADER = "x-csrf-token";
