import "server-only";

/**
 * Tiny TTL cache for hot, rarely-changing reads (category tree, banners,
 * platform settings). Process-local; replace with Redis for multi-instance
 * deployments. Mutations call `invalidate(prefix)`.
 */
const store = (globalThis as unknown as { __sabakyCache?: Map<string, { value: unknown; expires: number }> }).__sabakyCache ??
  new Map<string, { value: unknown; expires: number }>();
(globalThis as unknown as { __sabakyCache: typeof store }).__sabakyCache = store;

const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  // Coalesce concurrent misses (cache-stampede protection).
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const promise = load()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
