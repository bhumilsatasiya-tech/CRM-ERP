/**
 * In-memory lookup store — fed by `useLookupPrefetch` on app boot + company switch.
 *
 * Why: API-backed dropdown lookups felt slow because every keystroke triggered a
 * round-trip (even with backend Cache::remember). This store keeps the full
 * partner / product / account / unit / category lists in memory so SmartDropdown
 * can filter instantly with zero network on the typing critical path.
 *
 * Scale assumption: typical SMB → < 10k partners, < 20k products. ~1-2 MB of RAM total.
 *
 * Filter semantics: case-insensitive substring match on `code` OR `name` OR (optional)
 * `gst_no`. Sorted by name ascending; the first `limit` results are returned.
 *
 * Mutations (create/update/delete on partners/products/etc.) should call
 * `invalidateStore(kind)` to force a re-fetch on the next read. The existing
 * `invalidate('lookup:partners')` calls in *api.ts files now also bump this.
 */

import { apiClient } from '../modules/01-auth/api/axiosInstance';

export type LookupKind = 'partners' | 'products' | 'accounts' | 'units' | 'categories';

export interface LookupRow {
  id: number;
  code?: string | null;
  name?: string | null;
  // Pass-through fields callers may need to render or auto-fill from:
  type?: string | null;
  country?: string | null;
  tax_treatment?: string | null;
  gst_no?: string | null;
  hsn_code?: string | null;
  standard_cost?: number | null;
  standard_price?: number | null;
  unit?: { id: number; code?: string; symbol?: string } | null;
  symbol?: string | null;
  formal_name?: string | null;
  uqc?: string | null;
  is_base?: boolean | null;
  conversion_factor?: number | null;
  decimals_allowed?: number | null;
  is_group?: boolean | null;
  parent_id?: number | null;
  path?: string | null;
}

interface KindCache {
  rows: LookupRow[];
  fetchedAt: number;
  loading: boolean;
  inflight?: Promise<LookupRow[]>;
}

const STORE: Record<LookupKind, KindCache> = {
  partners:   { rows: [], fetchedAt: 0, loading: false },
  products:   { rows: [], fetchedAt: 0, loading: false },
  accounts:   { rows: [], fetchedAt: 0, loading: false },
  units:      { rows: [], fetchedAt: 0, loading: false },
  categories: { rows: [], fetchedAt: 0, loading: false },
};

/**
 * Max rows per kind. Kept conservative so a single fetch never holds the
 * single-threaded Windows dev server too long. If a real customer ever has more
 * than this, the SmartDropdown falls back to the paginated /lookup endpoint
 * (it still works, just per-keystroke instead of from cache).
 */
const PREFETCH_LIMITS: Record<LookupKind, number> = {
  partners:   1500,
  products:   3000,
  accounts:   1000,
  units:      300,
  categories: 500,
};

/** Resource path per kind on the API (paginated list endpoints). */
const ENDPOINTS: Record<LookupKind, string> = {
  partners:   '/partners',
  products:   '/products',
  accounts:   '/accounts',
  units:      '/product-units',
  categories: '/product-categories',
};

type EnvelopeShape = { data: LookupRow[] } | { data: { data: LookupRow[] } };

async function fetchAll(kind: LookupKind): Promise<LookupRow[]> {
  const url = ENDPOINTS[kind];
  const limit = PREFETCH_LIMITS[kind];
  // Use per_page=limit so paginated endpoints return everything in one call.
  const r = await apiClient.get<EnvelopeShape>(url, { params: { per_page: limit, page: 1 } });
  const env = r.data as { data?: unknown };
  // Some endpoints wrap with { data: [...] }, paginated ones with { data: [...], meta }.
  const rows = Array.isArray(env.data) ? (env.data as LookupRow[])
    : (env.data && typeof env.data === 'object' && Array.isArray((env.data as { data?: unknown }).data))
      ? ((env.data as { data: LookupRow[] }).data)
      : [];
  return rows;
}

/**
 * Get all rows for `kind`. If the in-memory cache is stale or empty, kicks off
 * a background fetch and resolves when it completes. Coalesces concurrent calls.
 */
export async function getAll(kind: LookupKind): Promise<LookupRow[]> {
  const c = STORE[kind];
  if (c.rows.length > 0) return c.rows;
  if (c.inflight) return c.inflight;
  c.loading = true;
  c.inflight = fetchAll(kind)
    .then((rows) => {
      c.rows = rows;
      c.fetchedAt = Date.now();
      return rows;
    })
    .catch(() => {
      c.rows = [];
      return [];
    })
    .finally(() => {
      c.loading = false;
      c.inflight = undefined;
    });
  return c.inflight;
}

/**
 * Synchronous filter — returns rows already in memory matching `q`, optionally
 * narrowed by `type`. Returns up to `limit` rows sorted by name asc.
 *
 * If the cache is empty, returns `[]` immediately. The caller should kick off
 * `getAll(kind)` to prime, then re-filter.
 */
export function filter(kind: LookupKind, q: string, opts: {
  type?: string;
  categoryId?: number;
  limit?: number;
  offset?: number;
} = {}): LookupRow[] {
  const all = STORE[kind].rows;
  if (all.length === 0) return [];
  const needle = q.trim().toLowerCase();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const matches: LookupRow[] = [];
  for (const r of all) {
    if (opts.type && r.type !== opts.type) continue;
    if (opts.categoryId && (r as { category_id?: number }).category_id !== opts.categoryId) continue;
    if (needle === '') {
      matches.push(r);
    } else {
      const code = (r.code ?? '').toLowerCase();
      const name = (r.name ?? '').toLowerCase();
      const gst  = (r.gst_no ?? '').toLowerCase();
      const hsn  = (r.hsn_code ?? '').toLowerCase();
      const sym  = (r.symbol ?? '').toLowerCase();
      if (code.includes(needle) || name.includes(needle) || gst.includes(needle) || hsn.includes(needle) || sym.includes(needle)) {
        matches.push(r);
      }
    }
  }
  matches.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  return matches.slice(offset, offset + limit);
}

/** True if the cache is populated (used by SmartDropdown wrappers to decide local vs network). */
export function isReady(kind: LookupKind): boolean {
  return STORE[kind].rows.length > 0;
}

/** Force re-fetch on next read (called by *api.ts on mutations). */
export function invalidateStore(kind: LookupKind): void {
  STORE[kind] = { rows: [], fetchedAt: 0, loading: false };
}

/** Drop ALL caches — called on company switch. */
export function clearAllStores(): void {
  (Object.keys(STORE) as LookupKind[]).forEach(invalidateStore);
}

/** Optionally upsert a single row after a successful create/update — avoids a full re-fetch. */
export function upsertRow(kind: LookupKind, row: LookupRow): void {
  const c = STORE[kind];
  if (c.rows.length === 0) return; // not loaded yet — full fetch will happen anyway
  const i = c.rows.findIndex((r) => r.id === row.id);
  if (i >= 0) c.rows[i] = { ...c.rows[i], ...row };
  else c.rows.push(row);
}

/** Remove a row from the cache (on delete). */
export function removeRow(kind: LookupKind, id: number): void {
  const c = STORE[kind];
  if (c.rows.length === 0) return;
  c.rows = c.rows.filter((r) => r.id !== id);
}
