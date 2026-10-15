import "server-only";
import { headers } from "next/headers";
import { hmac } from "../security/crypto";

/**
 * Client IP resolution. Behind a trusted reverse proxy / CDN the left-most
 * X-Forwarded-For entry is the client. Configure the edge to overwrite (not
 * append to) this header so it cannot be spoofed.
 */
export function clientIpFrom(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}

export async function requestMeta() {
  const h = await headers();
  const ip = clientIpFrom(h);
  return {
    ip,
    ipHash: hmac(ip),
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  };
}
