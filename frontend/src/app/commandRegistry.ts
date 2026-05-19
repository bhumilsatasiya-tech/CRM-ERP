/**
 * Command palette registry — every static destination, every "action" the user can
 * trigger from Ctrl+K. Partners / products / invoices etc. are fetched dynamically
 * from the lookup store + a recent-docs cache; this file holds only the static commands.
 */

export interface PaletteCommand {
  /** Stable id for keys + recency tracking. */
  id: string;
  /** Display title — what the user sees and searches against. */
  title: string;
  /** Optional shorter caption shown below the title. */
  subtitle?: string;
  /** Group bucket — displayed as a section header. */
  group: 'Page' | 'New' | 'Action' | 'Voucher' | 'Setting';
  /** Either a route to navigate to, OR a callback to run. */
  route?: string;
  run?: () => void;
  /** Optional keywords for fuzzy search beyond the title. */
  keywords?: string;
  /** Optional shortcut combo to display on the right side. */
  shortcut?: string;
}

/**
 * Static command list. Roughly ordered by frequency-of-use so when the query
 * is empty, the first ~20 are the user's most common destinations.
 */
export const STATIC_COMMANDS: PaletteCommand[] = [
  // --- New … (creating things — the biggest accelerator) ---
  { id: 'new.invoice',           title: 'New Invoice',                group: 'New', route: '/invoices/new',           keywords: 'sales bill create' },
  { id: 'new.quotation',         title: 'New Quotation',              group: 'New', route: '/quotations/new',         keywords: 'quote estimate' },
  { id: 'new.sales-order',       title: 'New Sales Order',            group: 'New', route: '/sales-orders/new',       keywords: 'so order' },
  { id: 'new.purchase-order',    title: 'New Purchase Order',         group: 'New', route: '/purchase-orders/new',    keywords: 'po buying' },
  { id: 'new.grn',               title: 'New GRN',                    group: 'New', route: '/grns/new',               keywords: 'receive goods' },
  { id: 'new.purchase-invoice',  title: 'New Purchase Invoice',       group: 'New', route: '/purchase-invoices/new',  keywords: 'pi supplier bill' },
  { id: 'new.export-invoice',    title: 'New Export Invoice',         group: 'New', route: '/export-invoices/new',    keywords: 'ei export' },
  { id: 'new.tax-invoice',       title: 'New Tax Invoice',            group: 'New', route: '/tax-invoices/new',       keywords: 'ti gst' },
  { id: 'new.shipping-bill',     title: 'New Shipping Bill',          group: 'New', route: '/shipping-bills/new',     keywords: 'sb dispatch' },
  { id: 'new.packing-list',      title: 'New Packing List',           group: 'New', route: '/packing-lists/new',      keywords: 'pl customs' },
  { id: 'new.irm',               title: 'New IRM (Inward Remittance)', group: 'New', route: '/irms/new',              keywords: 'bank advance receipt' },
  { id: 'new.lodgement',         title: 'New Export Lodgement',       group: 'New', route: '/export-lodgement/new',   keywords: 'bank submit' },
  { id: 'new.ici',               title: 'New Inter-Company Invoice',  group: 'New', route: '/inter-company-invoices/new', keywords: 'ici transfer billing' },
  { id: 'new.production-batch',  title: 'New Production Batch',       group: 'New', route: '/production-batches/new', keywords: 'manufacture' },
  { id: 'new.journal',           title: 'New Journal Entry',          group: 'New', route: '/journal-entries/new',    keywords: 'je accounting' },
  { id: 'new.loan',              title: 'New Loan',                   group: 'New', route: '/loans/new',              keywords: 'borrow lend emi' },
  { id: 'new.partner',           title: 'New Partner',                group: 'New', route: '/partners/new',           keywords: 'client supplier vendor' },
  { id: 'new.product',           title: 'New Product',                group: 'New', route: '/products/new',           keywords: 'item sku' },
  { id: 'new.employee',          title: 'New Employee',               group: 'New', route: '/employees/new',          keywords: 'staff hire' },

  // --- Voucher Drawer tabs ---
  { id: 'v.receipt',          title: 'Buyer Receipt',     group: 'Voucher', shortcut: 'Ctrl+Shift+R', run: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'receipt' })) },
  { id: 'v.supplier-payment', title: 'Supplier Payment',  group: 'Voucher', shortcut: 'Ctrl+Shift+P', run: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'supplier-payment' })) },
  { id: 'v.bank-receipt',     title: 'Bank Receipt',      group: 'Voucher', shortcut: 'Ctrl+Shift+B', run: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'bank-receipt' })) },
  { id: 'v.expense',          title: 'Expense Voucher',   group: 'Voucher', shortcut: 'Ctrl+Shift+E', run: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'expense' })) },
  { id: 'v.contra',           title: 'Contra (Bank ↔ Cash)', group: 'Voucher', shortcut: 'Ctrl+Shift+T', run: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'contra' })) },

  // --- Pages — Master ---
  { id: 'p.dashboard',  title: 'Dashboard',                group: 'Page', route: '/',                 shortcut: 'Alt+D' },
  { id: 'p.gw.crm',     title: 'CRM Gateway',              group: 'Page', route: '/gateway/crm',      shortcut: 'Alt+C' },
  { id: 'p.partners',   title: 'Partners (all)',           group: 'Page', route: '/partners',         keywords: 'clients suppliers vendors importers' },
  { id: 'p.clients',    title: 'Clients',                  group: 'Page', route: '/partners?type=client' },
  { id: 'p.suppliers',  title: 'Suppliers',                group: 'Page', route: '/partners?type=supplier' },
  { id: 'p.products',   title: 'Products',                 group: 'Page', route: '/products',         shortcut: 'Alt+M' },
  { id: 'p.categories', title: 'Product Categories',       group: 'Page', route: '/product-categories' },
  { id: 'p.units',      title: 'Product Units',            group: 'Page', route: '/product-units' },

  // --- Pages — Operations ---
  { id: 'p.gw.sales',         title: 'Sales Gateway',     group: 'Page', route: '/gateway/sales',      shortcut: 'Alt+S' },
  { id: 'p.quotations',       title: 'Quotations',        group: 'Page', route: '/quotations' },
  { id: 'p.sales-orders',     title: 'Sales Orders',      group: 'Page', route: '/sales-orders' },
  { id: 'p.invoices',         title: 'Invoices',          group: 'Page', route: '/invoices' },
  { id: 'p.gw.purchase',      title: 'Purchase Gateway',  group: 'Page', route: '/gateway/purchase',   shortcut: 'Alt+P' },
  { id: 'p.purchase-orders',  title: 'Purchase Orders',   group: 'Page', route: '/purchase-orders' },
  { id: 'p.grns',             title: 'GRNs',              group: 'Page', route: '/grns' },
  { id: 'p.purchase-invoices', title: 'Purchase Invoices', group: 'Page', route: '/purchase-invoices' },
  { id: 'p.gw.production',    title: 'Production Gateway', group: 'Page', route: '/gateway/production', shortcut: 'Alt+B' },
  { id: 'p.production-batches', title: 'Production Batches', group: 'Page', route: '/production-batches' },
  { id: 'p.formulas',         title: 'Formulas (BOM)',    group: 'Page', route: '/formulas' },

  // --- Pages — Export & Bank ---
  { id: 'p.gw.export',        title: 'Export & Bank Gateway', group: 'Page', route: '/gateway/export',     shortcut: 'Alt+X' },
  { id: 'p.export-invoices',  title: 'Export Invoices',   group: 'Page', route: '/export-invoices' },
  { id: 'p.packing-lists',    title: 'Packing Lists',     group: 'Page', route: '/packing-lists' },
  { id: 'p.tax-invoices',     title: 'Tax Invoices',      group: 'Page', route: '/tax-invoices' },
  { id: 'p.shipping-bills',   title: 'Shipping Bills',    group: 'Page', route: '/shipping-bills' },
  { id: 'p.irms',             title: 'IRMs',              group: 'Page', route: '/irms',                keywords: 'inward remittance' },
  { id: 'p.lodgements',       title: 'Export Lodgements', group: 'Page', route: '/export-lodgement' },
  { id: 'p.export-incentives', title: 'Export Incentives', group: 'Page', route: '/export-incentives',  keywords: 'drawback rodtep igst refund' },

  // --- Pages — Inventory ---
  { id: 'p.gw.inv',           title: 'Inventory Gateway', group: 'Page', route: '/gateway/inventory',  shortcut: 'Alt+I' },
  { id: 'p.stock-current',    title: 'Current Stock',     group: 'Page', route: '/stock/current' },
  { id: 'p.stock-ledger',     title: 'Stock Ledger',      group: 'Page', route: '/stock/ledger' },
  { id: 'p.stock-adjustments', title: 'Stock Adjustments', group: 'Page', route: '/stock/adjustments' },
  { id: 'p.stock-transfers',  title: 'Stock Transfers',   group: 'Page', route: '/stock/transfers' },

  // --- Pages — Finance ---
  { id: 'p.gw.finance',       title: 'Finance Gateway',   group: 'Page', route: '/gateway/finance',   shortcut: 'Alt+F' },
  { id: 'p.accounts',         title: 'Chart of Accounts', group: 'Page', route: '/accounts',          keywords: 'coa ledger gl' },
  { id: 'p.journals',         title: 'Journal Entries',   group: 'Page', route: '/journal-entries' },
  { id: 'p.trial-balance',    title: 'Trial Balance',     group: 'Page', route: '/finance/trial-balance' },

  // --- Pages — Other ---
  { id: 'p.gw.ici',           title: 'Inter-Company Gateway', group: 'Page', route: '/gateway/intercompany' },
  { id: 'p.ici',              title: 'Inter-Company Invoices', group: 'Page', route: '/inter-company-invoices' },
  { id: 'p.tracking',         title: 'Order Tracking',    group: 'Page', route: '/tracking' },
  { id: 'p.tasks',            title: 'Tasks',             group: 'Page', route: '/tasks' },
  { id: 'p.messages',         title: 'Messages',          group: 'Page', route: '/comm/messages',     keywords: 'email whatsapp' },
  { id: 'p.documents',        title: 'Documents',         group: 'Page', route: '/documents',         keywords: 'files attachments' },
  { id: 'p.loans',            title: 'Loans',             group: 'Page', route: '/loans' },
  { id: 'p.gw.hr',            title: 'HR Gateway',        group: 'Page', route: '/gateway/hr',        shortcut: 'Alt+H' },
  { id: 'p.employees',        title: 'Employees',         group: 'Page', route: '/employees' },
  { id: 'p.designations',     title: 'Designations',      group: 'Page', route: '/designations' },
  { id: 'p.salary-runs',      title: 'Salary Runs',       group: 'Page', route: '/salary-runs' },
  { id: 'p.gw.reports',       title: 'Reports Gateway',   group: 'Page', route: '/gateway/reports',   shortcut: 'Alt+R' },
  { id: 'p.statement',        title: 'Statement Hub',     group: 'Page', route: '/reports/statement', keywords: 'partner ledger account' },

  // --- Settings ---
  { id: 's.gw',          title: 'Settings Gateway',     group: 'Setting', route: '/gateway/settings',  shortcut: 'Alt+G' },
  { id: 's.companies',   title: 'Companies',            group: 'Setting', route: '/companies' },
  { id: 's.users',       title: 'Users',                group: 'Setting', route: '/users' },
  { id: 's.roles',       title: 'Roles & Permissions',  group: 'Setting', route: '/roles' },
  { id: 's.settings',    title: 'App Settings',         group: 'Setting', route: '/settings' },
  { id: 's.sequences',   title: 'Sequences',            group: 'Setting', route: '/sequences',       keywords: 'numbering doc' },
  { id: 's.templates',   title: 'Document Templates',   group: 'Setting', route: '/document-templates' },
  { id: 's.audit',       title: 'Audit Log',            group: 'Setting', route: '/audit-logs' },
  { id: 's.security',    title: 'Security & PIN Lock',  group: 'Setting', route: '/settings/security' },
];

/** Recency tracking — last-N opened commands persist across reloads. */
const RECENT_KEY = 'crm-erp:palette-recent';
const RECENT_MAX = 8;

export function getRecentCommandIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function recordCommandUse(id: string): void {
  try {
    const existing = getRecentCommandIds().filter((x) => x !== id);
    const next = [id, ...existing].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable in some browsers — fail silently
  }
}
