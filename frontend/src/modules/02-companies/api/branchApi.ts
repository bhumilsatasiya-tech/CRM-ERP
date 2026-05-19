import { apiClient } from '../../01-auth/api/axiosInstance';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '../types/companies.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export const branchApi = {
  list: (companyId: number, params: { search?: string; is_active?: boolean; page?: number; per_page?: number } = {}) =>
    apiClient.get<PaginatedEnvelope<Branch>>(`/companies/${companyId}/branches`, { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<{ data: Branch }>(`/branches/${id}`).then((r) => r.data.data),

  create: (companyId: number, payload: CreateBranchPayload) =>
    apiClient.post<{ data: Branch }>(`/companies/${companyId}/branches`, payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateBranchPayload) =>
    apiClient.put<{ data: Branch }>(`/branches/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/branches/${id}`).then((r) => r.data.data),
};
