import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { InterCompanyInvoice } from '../types/intercompany.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flush = () => { invalidate('list:inter-company-invoices'); invalidate('list:invoices'); invalidate('list:purchase-invoices'); };

export const interCompanyApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:inter-company-invoices', params, () => apiClient.get<Paginated<InterCompanyInvoice>>('/inter-company-invoices', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: InterCompanyInvoice }>(`/inter-company-invoices/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: InterCompanyInvoice }>('/inter-company-invoices', payload).then((r) => { flush(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: InterCompanyInvoice }>(`/inter-company-invoices/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/inter-company-invoices/${id}`).then((r) => { flush(); return r.data.data; }),
  post:    (id: number) => apiClient.post<{ data: InterCompanyInvoice }>(`/inter-company-invoices/${id}/post`).then((r) => { flush(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: InterCompanyInvoice }>(`/inter-company-invoices/${id}/cancel`, { reason }).then((r) => { flush(); return r.data.data; }),
};
