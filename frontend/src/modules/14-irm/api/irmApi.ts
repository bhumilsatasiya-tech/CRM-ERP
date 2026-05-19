import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { Irm } from '../types/irm.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flush = () => { invalidate('list:irms'); invalidate('list:export-invoices'); };

export const irmApi = {
  list:       (params: Record<string, unknown> = {}) =>
    cachedList('list:irms', params, () => apiClient.get<Paginated<Irm>>('/irms', { params }).then((r) => r.data)),
  get:        (id: number) => apiClient.get<{ data: Irm }>(`/irms/${id}`).then((r) => r.data.data),
  create:     (payload: Record<string, unknown>) => apiClient.post<{ data: Irm }>('/irms', payload).then((r) => { flush(); return r.data.data; }),
  update:     (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Irm }>(`/irms/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove:     (id: number) => apiClient.delete<{ data: { message: string } }>(`/irms/${id}`).then((r) => { flush(); return r.data.data; }),
  close:      (id: number, payload: Record<string, unknown>) => apiClient.post<{ data: { realization_id: number; irm: Irm } }>(`/irms/${id}/close`, payload).then((r) => { flush(); return r.data.data; }),
  cancel:     (id: number, reason?: string) => apiClient.post<{ data: Irm }>(`/irms/${id}/cancel`, { reason }).then((r) => { flush(); return r.data.data; }),
  allocate:   (id: number, payload: Record<string, unknown>) => apiClient.post<{ data: Irm }>(`/irms/${id}/allocate`, payload).then((r) => { flush(); return r.data.data; }),
  deallocate: (id: number, allocId: number) => apiClient.delete<{ data: Irm }>(`/irms/${id}/allocations/${allocId}`).then((r) => { flush(); return r.data.data; }),
};
