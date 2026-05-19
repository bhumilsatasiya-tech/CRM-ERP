import { apiClient } from './axiosInstance';
import type {
  ApiEnvelope,
  CreateRolePayload,
  PaginatedEnvelope,
  Permission,
  Role,
  UpdateRolePayload,
} from '../types/auth.types';

export const roleApi = {
  list: (filters: { search?: string; per_page?: number; page?: number } = {}) =>
    apiClient.get<PaginatedEnvelope<Role>>('/roles', { params: filters }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<ApiEnvelope<Role>>(`/roles/${id}`).then((r) => r.data.data),

  create: (payload: CreateRolePayload) =>
    apiClient.post<ApiEnvelope<Role>>('/roles', payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateRolePayload) =>
    apiClient.put<ApiEnvelope<Role>>(`/roles/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<ApiEnvelope<{ message: string }>>(`/roles/${id}`).then((r) => r.data.data),

  permissions: (filters: { module?: string; search?: string } = {}) =>
    apiClient.get<{ data: Permission[] }>('/permissions', { params: filters }).then((r) => r.data.data),
};
