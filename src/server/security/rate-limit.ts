import "server-only";

/**
 * Fixed-window rate limiter behind a store interface.
 * `MemoryStore` is correct for a single instance; for horizontal scaling plug a
 * shared store (Redis `INCR` + `PEXPIRE`) implementing the same interface.
 */
export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  reset(key: string): Promise<void>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    this.sweep(now);
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  async reset(key: string) {
    this.buckets.delete(key);
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
  }
}

const globalStore = globalThis as unknown as { __sabakyRateLimit?: RateLimitStore };
const store: RateLimitStore = (globalStore.__sabakyRateLimit ??= new MemoryStore());

export interface RateLimitRule {
  /** Logical bucket name, e.g. "login". */
  name: string;
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  login: { name: "login", limit: 10, windowMs: 60_000 },
  register: { name: "register", limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { name: "pwreset", limit: 5, windowMs: 15 * 60_000 },
  checkout: { name: "checkout", limit: 10, windowMs: 60_000 },
  write: { name: "write", limit: 60, windowMs: 60_000 },
  upload: { name: "upload", limit: 30, windowMs: 60_000 },
  search: { name: "search", limit: 120, windowMs: 60_000 },
  review: { name: "review", limit: 10, windowMs: 60 * 60_000 },
} satisfies Record<string, RateLimitRule>;

export async function rateLimit(rule: RateLimitRule, identifier: string) {
  const { count, resetAt } = await store.increment(`${rule.name}:${identifier}`, rule.windowMs);
  return {
    ok: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}
