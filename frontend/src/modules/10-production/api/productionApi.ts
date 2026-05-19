import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { ProductionBatch, QualityCheck } from '../types/production.types';

const flush = () => invalidate('list:production-batches');

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

export interface CompletePayload {
  actual_end_date?: string;
  inputs?: Array<{
    id: number;
    qty_consumed?: number;
    rate?: number;
    source_batch_no?: string | null;
  }>;
  outputs?: Array<{
    id: number;
    qty_produced?: number;
    rate?: number;
    output_batch_no?: string | null;
    expiry_date?: string | null;
  }>;
}

export const productionApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:production-batches', params, () => apiClient.get<Paginated<ProductionBatch>>('/production-batches', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: ProductionBatch }>(`/production-batches/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: ProductionBatch }>('/production-batches', payload).then((r) => { flush(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: ProductionBatch }>(`/production-batches/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/production-batches/${id}`).then((r) => { flush(); return r.data.data; }),

  submit:   (id: number) => apiClient.post<{ data: ProductionBatch }>(`/production-batches/${id}/submit`).then((r) => { flush(); return r.data.data; }),
  approve:  (id: number) => apiClient.post<{ data: ProductionBatch }>(`/production-batches/${id}/approve`).then((r) => { flush(); return r.data.data; }),
  start:    (id: number) => apiClient.post<{ data: ProductionBatch }>(`/production-batches/${id}/start`).then((r) => { flush(); return r.data.data; }),
  complete: (id: number, payload: CompletePayload) => apiClient.post<{ data: ProductionBatch }>(`/production-batches/${id}/complete`, payload).then((r) => { flush(); return r.data.data; }),
  cancel:   (id: number, reason?: string) => apiClient.post<{ data: ProductionBatch }>(`/production-batches/${id}/cancel`, { reason }).then((r) => { flush(); return r.data.data; }),

  recordQc: (id: number, payload: Partial<QualityCheck> & { result: 'pass' | 'fail' }) =>
    apiClient.post<{ data: { quality_check: QualityCheck; batch: ProductionBatch } }>(`/production-batches/${id}/quality-checks`, payload).then((r) => { flush(); return r.data.data; }),
  deleteQc: (id: number, qcId: number) =>
    apiClient.delete<{ data: ProductionBatch }>(`/production-batches/${id}/quality-checks/${qcId}`).then((r) => { flush(); return r.data.data; }),
};
