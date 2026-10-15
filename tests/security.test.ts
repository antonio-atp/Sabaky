import { describe, expect, it } from "vitest";
import { decryptField, encryptField, hmac, randomToken, safeEqual, sha256 } from "@/server/security/crypto";
import { hashPassword, isCommonPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { rateLimit } from "@/server/security/rate-limit";
import { safeReturnPath } from "@/server/auth/guards";
import { lockoutMinutes } from "@/server/services/auth";
import { generateOrderNumber } from "@/server/services/orders";
import { esc } from "@/server/integrations/email/templates";

describe("password hashing (Argon2id)", () => {
  it("hashes, verifies and never stores plaintext", async () => {
    const hash = await hashPassword("correct horse battery 9");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword(hash, "correct horse battery 9")).toBe(true);
    expect(await verifyPassword(hash, "wrong password 9")).toBe(false);
    expect(needsRehash(hash)).toBe(false);
  });
  it("treats malformed hashes as a failed check (no throw)", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
  it("blocks common passwords", () => {
    expect(isCommonPassword("Password123")).toBe(true);
    expect(isCommonPassword("unusual-phrase-42")).toBe(false);
  });
});

describe("tokens & crypto", () => {
  it("generates high-entropy URL-safe tokens", () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });
  it("hashes deterministically and compares in constant time", () => {
    expect(sha256("x")).toBe(sha256("x"));
    expect(hmac("1.2.3.4")).not.toContain("1.2.3.4");
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
  it("round-trips AES-256-GCM field encryption and detects tampering", () => {
    const enc = encryptField("PT123456789");
    expect(enc.startsWith("v1.")).toBe(true);
    expect(enc).not.toContain("PT123456789");
    expect(decryptField(enc)).toBe("PT123456789");
    const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "BB" : "AA");
    expect(() => decryptField(tampered)).toThrow();
  });
});

describe("abuse controls", () => {
  it("rate-limits per identifier within a window", async () => {
    const rule = { name: `test-${Date.now()}`, limit: 3, windowMs: 60_000 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await rateLimit(rule, "ip-1")).ok);
    expect(results).toEqual([true, true, true, false]);
    expect((await rateLimit(rule, "ip-2")).ok).toBe(true);
  });
  it("escalates account lockout exponentially and caps it", () => {
    expect(lockoutMinutes(4)).toBe(0);
    expect(lockoutMinutes(5)).toBe(1);
    expect(lockoutMinutes(7)).toBe(4);
    expect(lockoutMinutes(50)).toBe(60);
  });
  it("only allows same-origin relative redirects", () => {
    expect(safeReturnPath("/checkout")).toBe("/checkout");
    expect(safeReturnPath("//evil.com")).toBe("/");
    expect(safeReturnPath("https://evil.com")).toBe("/");
    expect(safeReturnPath("/\\evil.com")).toBe("/");
    expect(safeReturnPath(undefined, "/account")).toBe("/account");
  });
  it("escapes HTML in email templates", () => {
    expect(esc(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
  it("generates unambiguous, non-sequential order numbers", () => {
    const n = generateOrderNumber(new Date("2026-09-25T10:00:00Z"));
    expect(n).toMatch(/^SBK-260925-[A-HJ-NP-Z2-9]{6}$/);
    expect(generateOrderNumber()).not.toBe(generateOrderNumber());
  });
});
