import { apiClient } from '../../01-auth/api/axiosInstance';
import type { Formula, ScaleResponse } from '../types/formula.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

export const formulaApi = {
  list:    (params: Record<string, unknown> = {}) => apiClient.get<Paginated<Formula>>('/formulas', { params }).then((r) => r.data),
  get:     (id: number) => apiClient.get<{ data: Formula }>(`/formulas/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: Formula }>('/formulas', payload).then((r) => r.data.data),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Formula }>(`/formulas/${id}`, payload).then((r) => r.data.data),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/formulas/${id}`).then((r) => r.data.data),
  activate:(id: number) => apiClient.post<{ data: Formula }>(`/formulas/${id}/activate`).then((r) => r.data.data),
  scale:   (target_product_id: number, qty: number) =>
    apiClient.get<{ data: ScaleResponse }>('/formulas-scale', { params: { target_product_id, qty } }).then((r) => r.data.data),
};
