import { apiClient } from '../../01-auth/api/axiosInstance';

export interface MonthRollup {
  label: string;
  sales: number;
  purchase: number;
  produced: number;
}

export interface AgingBuckets {
  '0_30': number;
  '31_60': number;
  '61_90': number;
  over_90: number;
}

export interface DashboardKpis {
  sales: {
    invoices_count: number;
    invoiced_total: number;
    paid_total: number;
    outstanding_total: number;
  };
  purchase: {
    pos_count: number;
    pi_count: number;
    received_total: number;
    payable_total: number;
  };
  production: {
    batches_count: number;
    qty_produced: number;
    qty_failed: number;
    scrap_pct: number;
  };
  inventory: {
    stock_value_total: number;
    by_warehouse: Array<{ code: string; value: number }>;
  };
  export: {
    ei_count: number;
    ei_paid_inr: number;
    ei_outstanding_inr: number;
    irm_count_received: number;
    irm_count_closed: number;
  };
  finance: {
    ar_total: number;
    ap_total: number;
    ar_aging: AgingBuckets;
    ap_aging: AgingBuckets;
    posted_today: number;
    posted_week: number;
  };
  tasks: {
    open_count: number;
    overdue_count: number;
    due_today_count: number;
  };
  trends: {
    months: MonthRollup[];
  };
  activity: {
    invoices_today: number;
    invoices_week: number;
    pos_today: number;
    pos_week: number;
    batches_today: number;
    batches_week: number;
    journals_today: number;
    journals_week: number;
  };
}

export const dashboardApi = {
  kpis: (from: string, to: string) =>
    apiClient.get<{ data: DashboardKpis }>('/dashboard/kpis', { params: { from, to } }).then((r) => r.data.data),
};
