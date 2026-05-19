import { useEffect } from 'react';
import { useAppSelector } from './hooks';
import { clearAllStores, getAll, type LookupKind } from './lookupStore';

/**
 * Warm the in-memory lookup caches in the background.
 *
 * Why sequential + idle-deferred (not parallel + immediate):
 *   The dev server is `php artisan serve` which is SINGLE-THREADED on Windows.
 *   Five parallel `per_page=10000` requests at app boot would queue ahead of
 *   the user-clicked page (e.g. /products) and make it appear "stuck on skeleton".
 *
 * Strategy:
 *   1. Wait 1500 ms after mount — long enough for the user's clicked page to
 *      have its API request reach the wire first.
 *   2. Then prefetch ONE kind at a time, with 200 ms between, so we never
 *      have more than one in-flight prefetch competing for the server.
 *   3. Each request uses `requestIdleCallback` (or `setTimeout` fallback) so
 *      it yields to user-initiated work.
 *
 * Net effect: the visible page loads at full speed, the cache fills silently
 * over ~3 seconds afterwards, and dropdowns become instant by the time the
 * user clicks one.
 */

// Commercialization speed pass: prefetch EVERYTHING — small kinds first, then
// the two big ones (partners + products). Sequential + idle-deferred so we never
// compete with the user's first clicked page on the single-threaded dev server.
//
// Order matters: smallest payloads first so dropdowns start working ASAP even
// while the big partner/product lists are still streaming. After ~6-8 seconds
// the entire app's dropdown universe is in memory and ZERO further network
// hits happen on dropdown open for the rest of the session.
const ORDER: LookupKind[] = ['units', 'categories', 'accounts', 'partners', 'products'];
const INITIAL_DELAY_MS = 2500;  // Wait for the dashboard's API calls to finish first
const GAP_MS = 600;             // Slightly larger gap — big kinds need breathing room

function whenIdle(cb: () => void): void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 0);
  }
}

async function prefetchSequentially(): Promise<void> {
  for (const kind of ORDER) {
    await new Promise<void>((resolve) => {
      whenIdle(() => {
        void getAll(kind).finally(() => resolve());
      });
    });
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
}

export default function useLookupPrefetch() {
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.user));
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);

  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId) return;
    clearAllStores();
    const t = setTimeout(() => { void prefetchSequentially(); }, INITIAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [isAuthenticated, activeCompanyId]);

  useEffect(() => {
    const onSwitch = () => {
      clearAllStores();
      setTimeout(() => { void prefetchSequentially(); }, INITIAL_DELAY_MS);
    };
    window.addEventListener('crm-erp:company-switched', onSwitch);
    return () => window.removeEventListener('crm-erp:company-switched', onSwitch);
  }, []);
}
