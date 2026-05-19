import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { Grn, PurchaseInvoice, PurchaseOrder } from '../types/purchase.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flushPO  = () => invalidate('list:purchase-orders');
const flushGRN = () => invalidate('list:grns');
const flushPI  = () => invalidate('list:purchase-invoices');

export const purchaseOrderApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:purchase-orders', params, () => apiClient.get<Paginated<PurchaseOrder>>('/purchase-orders', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: PurchaseOrder }>(`/purchase-orders/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: PurchaseOrder }>('/purchase-orders', payload).then((r) => { flushPO(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: PurchaseOrder }>(`/purchase-orders/${id}`, payload).then((r) => { flushPO(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/purchase-orders/${id}`).then((r) => { flushPO(); return r.data.data; }),
  approve: (id: number) => apiClient.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/approve`).then((r) => { flushPO(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/cancel`, { reason }).then((r) => { flushPO(); return r.data.data; }),
};

export const grnApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:grns', params, () => apiClient.get<Paginated<Grn>>('/grns', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: Grn }>(`/grns/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: Grn }>('/grns', payload).then((r) => { flushGRN(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Grn }>(`/grns/${id}`, payload).then((r) => { flushGRN(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/grns/${id}`).then((r) => { flushGRN(); return r.data.data; }),
  receive: (id: number) => apiClient.post<{ data: Grn }>(`/grns/${id}/receive`).then((r) => { flushGRN(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: Grn }>(`/grns/${id}/cancel`, { reason }).then((r) => { flushGRN(); return r.data.data; }),
};

export const purchaseInvoiceApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:purchase-invoices', params, () => apiClient.get<Paginated<PurchaseInvoice>>('/purchase-invoices', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: PurchaseInvoice }>(`/purchase-invoices/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: PurchaseInvoice }>('/purchase-invoices', payload).then((r) => { flushPI(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: PurchaseInvoice }>(`/purchase-invoices/${id}`, payload).then((r) => { flushPI(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/purchase-invoices/${id}`).then((r) => { flushPI(); return r.data.data; }),
  post:    (id: number) => apiClient.post<{ data: PurchaseInvoice }>(`/purchase-invoices/${id}/post`).then((r) => { flushPI(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: PurchaseInvoice }>(`/purchase-invoices/${id}/cancel`, { reason }).then((r) => { flushPI(); return r.data.data; }),
};
