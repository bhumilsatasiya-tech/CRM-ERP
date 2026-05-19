/**
 * Per-route chunk prefetch.
 *
 * Two prefetch paths feed the same map:
 *
 *   1. **Idle prefetch on app boot** — after first paint, browser is idle, we quietly
 *      pull every sidebar destination's chunk into the browser cache. Cost: ~1 MB
 *      one-time over slow idle slots. Benefit: every subsequent navigation is INSTANT.
 *
 *   2. **Hover/focus prefetch** — when the user hovers a sidebar link, the chunk is
 *      already loaded (via #1) but if it weren't, we'd warm it before they click. Caught
 *      via `<PrefetchLink>` → `prefetchByPath()`.
 *
 * Vite caches the dynamic-import promise — calling `() => import(...)` twice resolves
 * the second call instantly from cache. So spam-clicking is fine.
 */

// Path (without query string) → lazy importer. ALL sidebar destinations live here.
const ROUTES: Record<string, () => Promise<unknown>> = {
  // Tally-style Gateway landing pages — primary sidebar entry points
  '/gateway/crm':          () => import('../modules/common/gateways/CrmGateway'),
  '/gateway/products':     () => import('../modules/common/gateways/ProductsGateway'),
  '/gateway/inventory':    () => import('../modules/common/gateways/InventoryGateway'),
  '/gateway/purchase':     () => import('../modules/common/gateways/PurchaseGateway'),
  '/gateway/sales':        () => import('../modules/common/gateways/SalesGateway'),
  '/gateway/production':   () => import('../modules/common/gateways/ProductionGateway'),
  '/gateway/export':       () => import('../modules/common/gateways/ExportGateway'),
  '/gateway/intercompany': () => import('../modules/common/gateways/InterCompanyGateway'),
  '/gateway/finance':      () => import('../modules/common/gateways/FinanceGateway'),
  '/gateway/hr':           () => import('../modules/common/gateways/HrGateway'),
  '/gateway/reports':      () => import('../modules/common/gateways/ReportsGateway'),
  '/gateway/settings':     () => import('../modules/common/gateways/SettingsGateway'),
  '/reports/statement':    () => import('../modules/common/gateways/StatementHub'),

  // Master data
  '/companies':           () => import('../modules/02-companies/pages/CompaniesListPage'),
  '/partners':            () => import('../modules/04-crm/pages/PartnersListPage'),
  '/products':            () => import('../modules/05-products/pages/ProductsListPage'),
  '/product-categories':  () => import('../modules/05-products/pages/CategoriesPage'),
  '/product-units':       () => import('../modules/05-products/pages/UnitsPage'),

  // Inventory
  '/stock/current':       () => import('../modules/06-inventory/pages/CurrentStockPage'),
  '/stock/ledger':        () => import('../modules/06-inventory/pages/StockLedgerPage'),
  '/stock/adjustments':   () => import('../modules/06-inventory/pages/StockAdjustmentsListPage'),
  '/stock/transfers':     () => import('../modules/06-inventory/pages/StockTransfersListPage'),

  // Purchase
  '/purchase-orders':     () => import('../modules/07-purchase/pages/PurchaseOrdersListPage'),
  '/grns':                () => import('../modules/07-purchase/pages/GrnsListPage'),
  '/purchase-invoices':   () => import('../modules/07-purchase/pages/PurchaseInvoicesListPage'),

  // Sales
  '/quotations':          () => import('../modules/08-quotation/pages/QuotationsListPage'),
  '/sales-orders':        () => import('../modules/09-sales/pages/SalesOrdersListPage'),
  '/invoices':            () => import('../modules/09-sales/pages/InvoicesListPage'),

  // Production
  '/production-batches':  () => import('../modules/10-production/pages/ProductionBatchesListPage'),
  '/formulas':            () => import('../modules/12-formula/pages/FormulasListPage'),

  // Export
  '/export-invoices':     () => import('../modules/13-export/pages/ExportInvoicesListPage'),
  '/packing-lists':       () => import('../modules/13-export/pages/PackingListsListPage'),
  '/tax-invoices':        () => import('../modules/13-export/pages/TaxInvoicesListPage'),
  '/shipping-bills':      () => import('../modules/13-export/pages/ShippingBillsListPage'),

  // IRM + Lodgement + Incentives
  '/irms':                () => import('../modules/14-irm/pages/IrmsListPage'),
  '/export-lodgement':    () => import('../modules/14-irm/pages/ExportLodgementsListPage'),
  '/export-incentives':   () => import('../modules/24-export-incentives/pages/ExportIncentivesListPage'),

  // Inter-Company
  '/inter-company-invoices': () => import('../modules/15-intercompany/pages/InterCompanyInvoicesListPage'),

  // Operations
  '/tracking':            () => import('../modules/11-tracking/pages/TrackingDashboardPage'),
  '/tasks':               () => import('../modules/20-tasks/pages/TasksListPage'),
  '/comm/messages':       () => import('../modules/21-comms/pages/MessagesListPage'),
  '/comm/templates':      () => import('../modules/21-comms/pages/TemplatesPage'),
  '/documents':           () => import('../modules/19-documents/pages/DocumentsListPage'),

  // Finance
  '/accounts':                () => import('../modules/16-finance/pages/AccountsListPage'),
  '/journal-entries':         () => import('../modules/16-finance/pages/JournalEntriesListPage'),
  '/finance/trial-balance':   () => import('../modules/16-finance/pages/TrialBalancePage'),

  // Loans / HR
  '/loans':               () => import('../modules/17-loans/pages/LoansListPage'),
  '/employees':           () => import('../modules/18-hr/pages/EmployeesListPage'),
  '/designations':        () => import('../modules/18-hr/pages/DesignationsPage'),
  '/salary-components':   () => import('../modules/18-hr/pages/SalaryComponentsPage'),
  '/salary-runs':         () => import('../modules/18-hr/pages/SalaryRunsListPage'),

  // Reports
  '/reports':             () => import('../modules/22-reports/pages/ReportsHomePage'),

  // Users / Roles / System
  '/users':                  () => import('../modules/01-auth/pages/UsersListPage'),
  '/roles':                  () => import('../modules/01-auth/pages/RolesListPage'),
  '/settings':               () => import('../modules/03-settings/pages/SettingsPage'),
  '/sequences':              () => import('../modules/03-settings/pages/SequencesPage'),
  '/document-templates':     () => import('../modules/03-settings/pages/DocumentTemplatesPage'),
  '/audit-logs':             () => import('../modules/03-settings/pages/AuditLogPage'),
};

// Keys ordered by likelihood of next click — drives the idle-prefetch order.
// Gateway pages first: those are the new Tally-style primary entry points, hit
// before any list page. Then the most-used list pages.
const PRIORITY_ORDER: string[] = [
  '/gateway/sales', '/gateway/purchase', '/gateway/finance', '/gateway/crm',
  '/gateway/production', '/gateway/export', '/gateway/inventory', '/gateway/products',
  '/gateway/reports', '/gateway/hr', '/gateway/intercompany', '/gateway/settings',
  '/reports/statement',
  '/partners', '/products', '/invoices', '/sales-orders',
  '/purchase-orders', '/export-invoices', '/tasks', '/stock/current',
  '/quotations', '/grns', '/purchase-invoices', '/production-batches',
  '/irms', '/export-lodgement', '/shipping-bills', '/packing-lists',
  '/tax-invoices', '/export-incentives', '/inter-company-invoices',
  '/tracking', '/comm/messages', '/comm/templates', '/documents',
  '/accounts', '/journal-entries', '/finance/trial-balance', '/loans',
  '/employees', '/designations', '/salary-components', '/salary-runs',
  '/reports', '/companies', '/product-categories', '/product-units',
  '/stock/ledger', '/stock/adjustments', '/stock/transfers',
  '/users', '/roles', '/settings', '/sequences', '/document-templates', '/audit-logs',
];

const inflight = new Set<string>();

/**
 * Prefetch the chunk for a given path. Strips query strings. Idempotent — calling
 * twice for the same path is cheap (Vite caches the import promise).
 */
export function prefetchByPath(pathOrLink: string): void {
  const path = pathOrLink.split('?')[0];
  const importer = ROUTES[path];
  if (!importer) return;
  if (inflight.has(path)) return;
  inflight.add(path);
  void importer().catch(() => undefined).finally(() => {
    // Keep the set entry so we don't redo the import; but the Vite module cache makes this cheap anyway.
  });
}

let started = false;

/**
 * Idle-time bulk prefetch. Pulls priority routes first, staggered across idle slots
 * so we never block the main thread. Safe to call multiple times.
 */
export function startIdlePrefetch(): void {
  if (started) return;
  started = true;

  const idle = (cb: () => void) =>
    'requestIdleCallback' in window
      ? (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
          .requestIdleCallback(cb, { timeout: 4000 })
      : window.setTimeout(cb, 1500);

  // Prefetch in waves of 6 routes per idle slot. Total of ~7-8 idle slots for 43 routes.
  const waveSize = 6;
  const fire = (i: number) => idle(() => {
    PRIORITY_ORDER.slice(i, i + waveSize).forEach((p) => prefetchByPath(p));
    if (i + waveSize < PRIORITY_ORDER.length) fire(i + waveSize);
  });
  fire(0);
}
