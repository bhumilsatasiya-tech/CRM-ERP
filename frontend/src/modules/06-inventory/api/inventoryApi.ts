import { apiClient } from '../../01-auth/api/axiosInstance';
import type {
  CreateStockAdjustmentPayload, CreateStockTransferPayload,
  CurrentStockRow, StockAdjustment, StockLedgerRow, StockTransfer,
} from '../types/inventory.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export const stockLedgerApi = {
  list: (params: {
    product_id?: number; warehouse_id?: number; movement_type?: string;
    batch_no?: string; reference_no?: string;
    from?: string; to?: string;
    page?: number; per_page?: number;
  } = {}) =>
    apiClient.get<PaginatedEnvelope<StockLedgerRow>>('/stock/ledger', { params }).then((r) => r.data),

  current: (warehouseId?: number) =>
    apiClient.get<{ data: CurrentStockRow[] }>('/stock/current', { params: { warehouse_id: warehouseId } }).then((r) => r.data.data),

  lowStock: () =>
    apiClient.get<{ data: CurrentStockRow[] }>('/stock/reports/low-stock').then((r) => r.data.data),

  valuation: (asOf?: string) =>
    apiClient.get<{ data: { as_of: string; company_id: number | null; total_value: number } }>('/stock/reports/valuation', { params: { as_of: asOf } }).then((r) => r.data.data),
};

export const stockAdjustmentApi = {
  list: (params: { search?: string; status?: string; warehouse_id?: number; from?: string; to?: string; page?: number; per_page?: number } = {}) =>
    apiClient.get<PaginatedEnvelope<StockAdjustment>>('/stock/adjustments', { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get<{ data: StockAdjustment }>(`/stock/adjustments/${id}`).then((r) => r.data.data),
  create: (payload: CreateStockAdjustmentPayload) =>
    apiClient.post<{ data: StockAdjustment }>('/stock/adjustments', payload).then((r) => r.data.data),
  update: (id: number, payload: Partial<CreateStockAdjustmentPayload>) =>
    apiClient.put<{ data: StockAdjustment }>(`/stock/adjustments/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/stock/adjustments/${id}`).then((r) => r.data.data),
  submit:  (id: number) => apiClient.post<{ data: StockAdjustment }>(`/stock/adjustments/${id}/submit`).then((r) => r.data.data),
  approve: (id: number) => apiClient.post<{ data: StockAdjustment }>(`/stock/adjustments/${id}/approve`).then((r) => r.data.data),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: StockAdjustment }>(`/stock/adjustments/${id}/cancel`, { reason }).then((r) => r.data.data),
};

export const stockTransferApi = {
  list: (params: { search?: string; status?: string; from?: string; to?: string; page?: number; per_page?: number } = {}) =>
    apiClient.get<PaginatedEnvelope<StockTransfer>>('/stock/transfers', { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get<{ data: StockTransfer }>(`/stock/transfers/${id}`).then((r) => r.data.data),
  create: (payload: CreateStockTransferPayload) =>
    apiClient.post<{ data: StockTransfer }>('/stock/transfers', payload).then((r) => r.data.data),
  update: (id: number, payload: Partial<CreateStockTransferPayload>) =>
    apiClient.put<{ data: StockTransfer }>(`/stock/transfers/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/stock/transfers/${id}`).then((r) => r.data.data),
  send:    (id: number) => apiClient.post<{ data: StockTransfer }>(`/stock/transfers/${id}/send`).then((r) => r.data.data),
  receive: (id: number) => apiClient.post<{ data: StockTransfer }>(`/stock/transfers/${id}/receive`).then((r) => r.data.data),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: StockTransfer }>(`/stock/transfers/${id}/cancel`, { reason }).then((r) => r.data.data),
};
