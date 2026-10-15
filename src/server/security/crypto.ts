import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../env";

/** URL-safe random token (default 256 bits of entropy). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Tokens are stored hashed: a DB leak does not yield usable sessions/reset links. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Keyed hash for pseudonymising identifiers (IP addresses, emails in telemetry)
 * so logs remain useful for abuse detection without storing raw personal data.
 */
export function hmac(value: string): string {
  return createHmac("sha256", env().AUTH_SECRET).update(value.toLowerCase()).digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * AES-256-GCM field encryption for sensitive-at-rest values (e.g. seller tax IDs).
 * Key: 32 bytes base64 in DATA_ENCRYPTION_KEY. Format: v1.<iv>.<tag>.<ciphertext>
 */
function key(): Buffer | null {
  const raw = env().DATA_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes (base64)");
  return buf;
}

export function encryptField(plaintext: string): string {
  const k = key();
  if (!k) return plaintext; // encryption disabled in local development
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptField(value: string): string {
  if (!value.startsWith("v1.")) return value;
  const k = key();
  if (!k) throw new Error("Encrypted value found but DATA_ENCRYPTION_KEY is not configured");
  const [, iv, tag, ct] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
