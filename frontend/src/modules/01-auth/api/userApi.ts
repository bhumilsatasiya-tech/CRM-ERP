import { apiClient } from './axiosInstance';
import type {
  ApiEnvelope,
  CreateUserPayload,
  PaginatedEnvelope,
  UpdateUserPayload,
  User,
  UserListFilters,
} from '../types/auth.types';

export const userApi = {
  list: (filters: UserListFilters = {}) =>
    apiClient.get<PaginatedEnvelope<User>>('/users', { params: filters }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<ApiEnvelope<User>>(`/users/${id}`).then((r) => r.data.data),

  create: (payload: CreateUserPayload) =>
    apiClient.post<ApiEnvelope<User>>('/users', payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateUserPayload) =>
    apiClient.put<ApiEnvelope<User>>(`/users/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<ApiEnvelope<{ message: string }>>(`/users/${id}`).then((r) => r.data.data),

  adminResetPassword: (id: number, password: string, password_confirmation: string) =>
    apiClient
      .post<ApiEnvelope<{ message: string }>>(`/users/${id}/reset-password`, {
        password,
        password_confirmation,
        must_change_password: true,
      })
      .then((r) => r.data.data),
};
