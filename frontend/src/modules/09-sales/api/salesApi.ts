import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { Invoice, InvoicePayment, SalesOrder } from '../types/sales.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flushSO = () => invalidate('list:sales-orders');
const flushInv = () => invalidate('list:invoices');

export const salesOrderApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:sales-orders', params, () => apiClient.get<Paginated<SalesOrder>>('/sales-orders', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: SalesOrder }>(`/sales-orders/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: SalesOrder }>('/sales-orders', payload).then((r) => { flushSO(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: SalesOrder }>(`/sales-orders/${id}`, payload).then((r) => { flushSO(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/sales-orders/${id}`).then((r) => { flushSO(); return r.data.data; }),
  approve: (id: number) => apiClient.post<{ data: SalesOrder }>(`/sales-orders/${id}/approve`).then((r) => { flushSO(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: SalesOrder }>(`/sales-orders/${id}/cancel`, { reason }).then((r) => { flushSO(); return r.data.data; }),
};

export const invoiceApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:invoices', params, () => apiClient.get<Paginated<Invoice>>('/invoices', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: Invoice }>(`/invoices/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: Invoice }>('/invoices', payload).then((r) => { flushInv(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Invoice }>(`/invoices/${id}`, payload).then((r) => { flushInv(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/invoices/${id}`).then((r) => { flushInv(); return r.data.data; }),
  post:    (id: number) => apiClient.post<{ data: Invoice }>(`/invoices/${id}/post`).then((r) => { flushInv(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: Invoice }>(`/invoices/${id}/cancel`, { reason }).then((r) => { flushInv(); return r.data.data; }),
  recordPayment: (id: number, payload: Partial<InvoicePayment> & { amount: number }) =>
    apiClient.post<{ data: { payment_id: number; invoice: Invoice } }>(`/invoices/${id}/payments`, payload).then((r) => { flushInv(); return r.data.data; }),
  deletePayment: (id: number, paymentId: number) =>
    apiClient.delete<{ data: Invoice }>(`/invoices/${id}/payments/${paymentId}`).then((r) => { flushInv(); return r.data.data; }),
};
