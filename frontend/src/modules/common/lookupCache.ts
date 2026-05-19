/**
 * In-memory frontend cache for repeated lookup calls (partners/products/units/categories).
 *
 * The backend already caches lookups for 60s, but every page navigation re-fetches anyway.
 * This cache short-circuits the network round-trip when the same query was run recently.
 *
 * Default TTL: 30s — short enough that "I just deleted X, why is it still in the dropdown"
 * is rare; long enough that opening 5 forms in a row doesn't refetch the same partner list 5×.
 *
 * Mutations (create / update / delete) call `invalidate(prefix)` to drop matching entries
 * so the next lookup re-fetches.
 */

interface Entry<T> {
  expiresAt: number;
  promise?: Promise<T>; // in-flight de-dup
  value?: T;
}

const store = new Map<string, Entry<unknown>>();
const DEFAULT_TTL_MS = 120_000;

/**
 * Cache-aware fetch. Returns the cached value if fresh; otherwise calls `fetcher` once
 * (de-duplicating concurrent calls with the same key).
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && hit.value !== undefined && hit.expiresAt > now) return hit.value;
  if (hit?.promise) return hit.promise;

  const promise = (async () => {
    try {
      const value = await fetcher();
      store.set(key, { value, expiresAt: now + ttlMs });
      return value;
    } catch (e) {
      store.delete(key); // never cache errors
      throw e;
    }
  })();

  store.set(key, { expiresAt: now + ttlMs, promise: promise as Promise<unknown> });
  return promise;
}

/**
 * Like `cachedFetch` but with a 60s TTL suitable for list-page fetches.
 *
 * Why: clicking from List → Detail → back to List is the most common navigation
 * pattern. Without a list cache, every back-nav re-fetches. With 60s TTL, list pages
 * feel static for minutes — every navigation inside the window is INSTANT. Rapid
 * edits don't read stale data because invalidation is automatic on every mutation
 * (create/update/delete + cascading cross-prefix flushes for EI→PL/TI, ICI→inv/PI,
 * IRM/lodgement→EI, etc.), and company switch flushes everything.
 */
export const LIST_TTL_MS = 60_000;

/** Convenience wrapper for list endpoints. Key is auto-built from a prefix + params. */
export function cachedList<T>(prefix: string, params: Record<string, unknown> | undefined, fetcher: () => Promise<T>): Promise<T> {
  const key = `${prefix}:${stableStringify(params ?? {})}`;
  return cachedFetch(key, fetcher, LIST_TTL_MS);
}

/** Stable stringify so `{a:1,b:2}` and `{b:2,a:1}` produce the same cache key. */
function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${k}=${JSON.stringify(obj[k] ?? '')}`);
  return pairs.join('&');
}

/** Drop every cache entry whose key starts with `prefix`. Call after any mutation. */
export function invalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Drop the entire cache — used on company switch. */
export function flushAll(): void {
  store.clear();
}

// Listen for the company-switched custom event (fired by the topbar switcher) → flush all.
if (typeof window !== 'undefined') {
  window.addEventListener('crm-erp:company-switched', () => flushAll());
}
