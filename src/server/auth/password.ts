import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with OWASP-recommended parameters (m=19 MiB, t=2, p=1).
 * Parameters are encoded in the hash string, so they can be raised later and
 * old hashes transparently upgraded on next login (see `needsRehash`).
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS /* algorithm defaults to Argon2id */);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function needsRehash(passwordHash: string): boolean {
  return !passwordHash.includes(`m=${OPTIONS.memoryCost},t=${OPTIONS.timeCost},p=${OPTIONS.parallelism}`);
}

/**
 * A precomputed hash verified when the account does not exist, so response
 * timing does not reveal which emails are registered.
 */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("sabaky-timing-equaliser-0000");
  await verifyPassword(await dummyHash, password);
}

/** Small deny-list of the most common passwords (full list: HIBP k-anonymity API). */
const COMMON = new Set([
  "password123",
  "1234567890",
  "qwerty12345",
  "password1234",
  "iloveyou123",
  "admin12345",
  "welcome123",
  "sabaky12345",
  "letmein1234",
  "abc1234567",
]);
export function isCommonPassword(password: string): boolean {
  return COMMON.has(password.toLowerCase());
}
