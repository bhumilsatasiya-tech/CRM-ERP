import { apiClient } from '../../01-auth/api/axiosInstance';
import type { CreateClaimPayload, ExportIncentiveClaim, IncentiveStatus } from '../types/exportIncentives.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export const exportIncentiveApi = {
  list: (params: { type?: string; status?: string; shipping_bill_id?: number; from?: string; to?: string; per_page?: number; page?: number } = {}) =>
    apiClient.get<PaginatedEnvelope<ExportIncentiveClaim>>('/export-incentive-claims', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<{ data: ExportIncentiveClaim }>(`/export-incentive-claims/${id}`).then((r) => r.data.data),

  create: (payload: CreateClaimPayload) =>
    apiClient.post<{ data: ExportIncentiveClaim }>('/export-incentive-claims', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<CreateClaimPayload>) =>
    apiClient.put<{ data: ExportIncentiveClaim }>(`/export-incentive-claims/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/export-incentive-claims/${id}`).then((r) => r.data.data),

  transition: (id: number, toStatus: IncentiveStatus, payload: Record<string, unknown> = {}) =>
    apiClient.post<{ data: ExportIncentiveClaim }>(`/export-incentive-claims/${id}/transition`, { to_status: toStatus, ...payload }).then((r) => r.data.data),
};
