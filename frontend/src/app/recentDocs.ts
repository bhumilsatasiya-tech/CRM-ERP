/**
 * Recent + Pinned documents — persisted in localStorage, per-company.
 *
 * Auto-records visits to /invoices/:id/edit, /sales-orders/:id/edit, etc. The
 * URL pattern matches `record(path)` deduplicates and keeps the most recent 10.
 *
 * Pinned items are stored separately and never auto-evict.
 */

import type { ChainNodeType } from '../modules/common/VoucherChainStrip';

export interface RecentDoc {
  path: string;
  type: ChainNodeType | 'page';
  code: string;
  visitedAt: number;
}

const RECENT_KEY = 'crm-erp:recent-docs';
const PINNED_KEY = 'crm-erp:pinned-docs';
const MAX_RECENT = 10;
const MAX_PINNED = 8;

/** Map a URL path → {type, code} if it's a recognized doc detail/edit page. */
function classify(path: string): { type: ChainNodeType | 'page'; code: string } | null {
  // Match /<resource>/<id>/edit or /<resource>/<id>
  const editMatch = path.match(/^\/([a-z-]+)\/(\d+)(\/edit)?$/);
  if (!editMatch) return null;
  const [, resource, id] = editMatch;

  const RESOURCE_TO_TYPE: Record<string, ChainNodeType> = {
    'invoices':                'invoice',
    'quotations':              'quotation',
    'sales-orders':            'sales-order',
    'purchase-orders':         'purchase-order',
    'grns':                    'grn',
    'purchase-invoices':       'purchase-invoice',
    'production-batches':      'production-batch',
    'export-invoices':         'export-invoice',
    'packing-lists':           'packing-list',
    'tax-invoices':            'tax-invoice',
    'shipping-bills':          'shipping-bill',
    'irms':                    'irm',
    'export-lodgement':        'lodgement',
    'journal-entries':         'journal-entry',
    'inter-company-invoices':  'inter-company-invoice',
  };
  const type = RESOURCE_TO_TYPE[resource];
  if (!type) return null;
  return { type, code: `#${id}` };
}

/** Record a visit. Idempotent — same path within 30s is treated as one visit. */
export function recordVisit(path: string, codeOverride?: string): void {
  const meta = classify(path);
  if (!meta) return;
  try {
    const existing = getRecent();
    const dedup = existing.filter((d) => d.path !== path);
    const next: RecentDoc[] = [
      { path, type: meta.type, code: codeOverride ?? meta.code, visitedAt: Date.now() },
      ...dedup,
    ].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('crm-erp:recent-docs-updated'));
  } catch { /* localStorage may be unavailable */ }
}

export function getRecent(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function getPinned(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function togglePin(doc: RecentDoc): void {
  try {
    const existing = getPinned();
    const isPinned = existing.some((d) => d.path === doc.path);
    let next: RecentDoc[];
    if (isPinned) next = existing.filter((d) => d.path !== doc.path);
    else next = [{ ...doc, visitedAt: Date.now() }, ...existing].slice(0, MAX_PINNED);
    localStorage.setItem(PINNED_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('crm-erp:recent-docs-updated'));
  } catch { /* ignore */ }
}

export function isPinned(path: string): boolean {
  return getPinned().some((d) => d.path === path);
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
    window.dispatchEvent(new CustomEvent('crm-erp:recent-docs-updated'));
  } catch { /* ignore */ }
}
