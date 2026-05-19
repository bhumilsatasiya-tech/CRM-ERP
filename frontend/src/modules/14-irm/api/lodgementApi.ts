import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { Lodgement, UtilizationStatus } from '../types/lodgement.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flush = () => { invalidate('list:lodgements'); invalidate('list:irms'); invalidate('list:export-invoices'); };

export const lodgementApi = {
  list:      (params: Record<string, unknown> = {}) =>
    cachedList('list:lodgements', params, () => apiClient.get<Paginated<Lodgement>>('/lodgements', { params }).then((r) => r.data)),
  get:       (id: number) => apiClient.get<{ data: Lodgement }>(`/lodgements/${id}`).then((r) => r.data.data),
  create:    (payload: Record<string, unknown>) => apiClient.post<{ data: Lodgement }>('/lodgements', payload).then((r) => { flush(); return r.data.data; }),
  update:    (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Lodgement }>(`/lodgements/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove:    (id: number) => apiClient.delete<{ data: { message: string } }>(`/lodgements/${id}`).then((r) => { flush(); return r.data.data; }),
  addRow:    (id: number, row: Record<string, unknown>) => apiClient.post<{ data: Lodgement }>(`/lodgements/${id}/rows`, row).then((r) => { flush(); return r.data.data; }),
  removeRow: (id: number, allocId: number) => apiClient.delete<{ data: Lodgement }>(`/lodgements/${id}/rows/${allocId}`).then((r) => { flush(); return r.data.data; }),
  markRow:   (id: number, allocId: number, status: UtilizationStatus, note?: string) => apiClient.patch<{ data: Lodgement }>(`/lodgements/${id}/rows/${allocId}`, { utilization_status: status, utilization_note: note }).then((r) => { flush(); return r.data.data; }),
  submit:    (id: number) => apiClient.post<{ data: Lodgement }>(`/lodgements/${id}/submit`).then((r) => { flush(); return r.data.data; }),
  accept:    (id: number, payload: { bank_receipt_no?: string; bank_receipt_date?: string; notes?: string }) => apiClient.post<{ data: Lodgement }>(`/lodgements/${id}/accept`, payload).then((r) => { flush(); return r.data.data; }),
  reject:    (id: number, reason?: string) => apiClient.post<{ data: Lodgement }>(`/lodgements/${id}/reject`, { reason }).then((r) => { flush(); return r.data.data; }),
  cancel:    (id: number) => apiClient.post<{ data: Lodgement }>(`/lodgements/${id}/cancel`).then((r) => { flush(); return r.data.data; }),
};
