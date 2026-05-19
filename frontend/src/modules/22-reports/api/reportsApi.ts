import { apiClient } from '../../01-auth/api/axiosInstance';

export type ReportPayload = Record<string, unknown>;

const get = <T = unknown>(path: string, params: Record<string, unknown> = {}) =>
  apiClient.get<{ data: T }>(`/reports/${path}`, { params }).then((r) => r.data.data);

export const reportsApi = {
  salesRegister:      (params: Record<string, unknown>) => get('sales-register',      params),
  purchaseRegister:   (params: Record<string, unknown>) => get('purchase-register',   params),
  stockSummary:       (params: Record<string, unknown>) => get('stock-summary',       params),
  productionSummary:  (params: Record<string, unknown>) => get('production-summary',  params),
  paymentsReceivable: (params: Record<string, unknown>) => get('payments-receivable', params),
  paymentsPayable:    (params: Record<string, unknown>) => get('payments-payable',    params),
  profitAndLoss:      (params: Record<string, unknown>) => get('profit-and-loss',     params),
  balanceSheet:       (params: Record<string, unknown>) => get('balance-sheet',       params),
  exportRealization:  (params: Record<string, unknown>) => get('export-realization',  params),
};

export const REPORT_DEFS: Record<string, { title: string; api: keyof typeof reportsApi; rangeMode: 'fromTo' | 'asOf' | 'none' }> = {
  'sales-register':      { title: 'Sales register',      api: 'salesRegister',      rangeMode: 'fromTo' },
  'purchase-register':   { title: 'Purchase register',   api: 'purchaseRegister',   rangeMode: 'fromTo' },
  'stock-summary':       { title: 'Stock summary',       api: 'stockSummary',       rangeMode: 'none' },
  'production-summary':  { title: 'Production summary',  api: 'productionSummary',  rangeMode: 'fromTo' },
  'payments-receivable': { title: 'Payments receivable', api: 'paymentsReceivable', rangeMode: 'asOf' },
  'payments-payable':    { title: 'Payments payable',    api: 'paymentsPayable',    rangeMode: 'asOf' },
  'profit-and-loss':     { title: 'Profit & Loss',       api: 'profitAndLoss',      rangeMode: 'fromTo' },
  'balance-sheet':       { title: 'Balance sheet',       api: 'balanceSheet',       rangeMode: 'asOf' },
  'export-realization':  { title: 'Export realization',  api: 'exportRealization',  rangeMode: 'fromTo' },
};
