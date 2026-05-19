/**
 * Central shortcut registry — single source of truth for every keyboard shortcut
 * in the app. The sidebar, gateway tiles, cheat-sheet modal, and the
 * `GlobalKeyboard` listener all read from THIS file.
 *
 * Convention:
 *   - Alt+letter        → navigate to a module gateway or page
 *   - Ctrl+Shift+letter → open the Quick Voucher Drawer to a specific tab
 *   - Ctrl+S / Esc / Ctrl+K / ?  → built-in helpers (handled in GlobalKeyboard)
 *
 * To rename a shortcut, edit it here and everything updates automatically.
 */

export interface Shortcut {
  /** Human-readable combo, e.g. "Alt+S". Used for display in tooltips / cheat sheet. */
  combo: string;
  /** Description shown in cheat sheet. */
  label: string;
  /** Internal action id — referenced by sidebar items, gateway tiles, etc. */
  id: string;
  /** Optional target route — if set, GlobalKeyboard navigates there on trigger. */
  route?: string;
  /** Optional category for grouping in the cheat sheet. */
  group?: 'Navigate' | 'Voucher' | 'Universal';
}

/** Module navigation — Alt+letter takes you to that module's Gateway page. */
export const MODULE_SHORTCUTS: Shortcut[] = [
  { id: 'nav.dashboard',  combo: 'Alt+D', label: 'Dashboard',         route: '/',                    group: 'Navigate' },
  { id: 'nav.crm',        combo: 'Alt+C', label: 'CRM (Partners)',    route: '/gateway/crm',         group: 'Navigate' },
  { id: 'nav.products',   combo: 'Alt+M', label: 'Products (master)', route: '/gateway/products',    group: 'Navigate' },
  { id: 'nav.inventory',  combo: 'Alt+I', label: 'Inventory',         route: '/gateway/inventory',   group: 'Navigate' },
  { id: 'nav.purchase',   combo: 'Alt+P', label: 'Purchase',          route: '/gateway/purchase',    group: 'Navigate' },
  { id: 'nav.sales',      combo: 'Alt+S', label: 'Sales',             route: '/gateway/sales',       group: 'Navigate' },
  { id: 'nav.production', combo: 'Alt+B', label: 'Production',        route: '/gateway/production',  group: 'Navigate' },
  { id: 'nav.export',     combo: 'Alt+X', label: 'Export & Bank',     route: '/gateway/export',      group: 'Navigate' },
  { id: 'nav.finance',    combo: 'Alt+F', label: 'Finance',           route: '/gateway/finance',     group: 'Navigate' },
  { id: 'nav.reports',    combo: 'Alt+R', label: 'Reports',           route: '/gateway/reports',     group: 'Navigate' },
  { id: 'nav.hr',         combo: 'Alt+H', label: 'HR',                route: '/gateway/hr',          group: 'Navigate' },
  { id: 'nav.settings',   combo: 'Alt+G', label: 'Settings',          route: '/gateway/settings',    group: 'Navigate' },
];

/** Quick Voucher Drawer tabs — Ctrl+Shift+letter opens the drawer to that tab. */
export const VOUCHER_SHORTCUTS: Shortcut[] = [
  { id: 'voucher.receipt',          combo: 'Ctrl+Shift+R', label: 'Buyer Receipt',    group: 'Voucher' },
  { id: 'voucher.supplier-payment', combo: 'Ctrl+Shift+P', label: 'Supplier Payment', group: 'Voucher' },
  { id: 'voucher.bank-receipt',     combo: 'Ctrl+Shift+B', label: 'Bank Receipt',     group: 'Voucher' },
  { id: 'voucher.expense',          combo: 'Ctrl+Shift+E', label: 'Expense',          group: 'Voucher' },
  { id: 'voucher.contra',           combo: 'Ctrl+Shift+T', label: 'Contra (transfer)', group: 'Voucher' },
];

/** Universal helpers. */
export const UNIVERSAL_SHORTCUTS: Shortcut[] = [
  { id: 'u.palette',  combo: 'Ctrl+K',  label: 'Command palette — find anything', group: 'Universal' },
  { id: 'u.save',     combo: 'Ctrl+S',  label: 'Save current form',  group: 'Universal' },
  { id: 'u.escape',   combo: 'Esc',     label: 'Close drawer / back', group: 'Universal' },
  { id: 'u.cheat',    combo: '?',       label: 'Show this cheat sheet', group: 'Universal' },
  { id: 'u.quickadd', combo: 'Alt+N',   label: 'Open Quick Voucher drawer', group: 'Universal' },
];

export const ALL_SHORTCUTS: Shortcut[] = [
  ...UNIVERSAL_SHORTCUTS,
  ...MODULE_SHORTCUTS,
  ...VOUCHER_SHORTCUTS,
];

/** Find a shortcut by its id (for inline display next to sidebar items / tiles). */
export function shortcutFor(id: string): string | undefined {
  return ALL_SHORTCUTS.find((s) => s.id === id)?.combo;
}

/** Parse "Alt+S" / "Ctrl+Shift+R" into a matcher predicate. */
export function matchCombo(combo: string, e: KeyboardEvent): boolean {
  const parts = combo.split('+').map((s) => s.trim().toLowerCase());
  const needsAlt   = parts.includes('alt');
  const needsCtrl  = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsMeta  = parts.includes('cmd') || parts.includes('meta');
  const key = parts[parts.length - 1];

  if (needsAlt   !== e.altKey)   return false;
  if (needsCtrl  !== (e.ctrlKey || e.metaKey)) return false;
  if (needsShift !== e.shiftKey) return false;
  if (needsMeta  && !e.metaKey)  return false;

  const pressed = (e.key ?? '').toLowerCase();
  // Handle single chars + special keys (escape, enter, etc.)
  if (key.length === 1) return pressed === key;
  if (key === 'esc' || key === 'escape') return pressed === 'escape';
  if (key === '?') return e.key === '?' || (e.shiftKey && e.key === '/');
  return pressed === key;
}
