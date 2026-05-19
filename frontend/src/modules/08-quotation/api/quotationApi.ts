import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { Quotation } from '../types/quotation.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flush = () => invalidate('list:quotations');

export const quotationApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:quotations', params, () => apiClient.get<Paginated<Quotation>>('/quotations', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: Quotation }>(`/quotations/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: Quotation }>('/quotations', payload).then((r) => { flush(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Quotation }>(`/quotations/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/quotations/${id}`).then((r) => { flush(); return r.data.data; }),
  approve: (id: number) => apiClient.post<{ data: Quotation }>(`/quotations/${id}/approve`).then((r) => { flush(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: Quotation }>(`/quotations/${id}/cancel`, { reason }).then((r) => { flush(); return r.data.data; }),
  convert: (id: number) => apiClient.post<{ data: { message: string; sales_order_id: number; sales_order_code: string; quotation: Quotation } }>(`/quotations/${id}/convert`).then((r) => { flush(); return r.data.data; }),
};
