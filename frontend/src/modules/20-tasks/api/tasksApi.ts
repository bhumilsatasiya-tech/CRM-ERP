import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { Task } from '../types/tasks.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flush = () => invalidate('list:tasks');

export const tasksApi = {
  list: (params: Record<string, unknown> = {}) =>
    cachedList('list:tasks', params, () => apiClient.get<Paginated<Task>>('/tasks', { params }).then((r) => r.data)),
  get: (id: number) => apiClient.get<{ data: Task }>(`/tasks/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => apiClient.post<{ data: Task }>('/tasks', payload).then((r) => { flush(); return r.data.data; }),
  update: (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Task }>(`/tasks/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove: (id: number) => apiClient.delete<{ data: { message: string } }>(`/tasks/${id}`).then((r) => { flush(); return r.data.data; }),
  complete: (id: number) => apiClient.post<{ data: Task }>(`/tasks/${id}/complete`).then((r) => { flush(); return r.data.data; }),
  reopen: (id: number) => apiClient.post<{ data: Task }>(`/tasks/${id}/reopen`).then((r) => { flush(); return r.data.data; }),
  syncToGoogle: (id: number) => apiClient.post<{ data: { google_event_id?: string; message?: string } }>(`/tasks/${id}/sync-to-google`).then((r) => r.data.data),
  authUrl: () => apiClient.get<{ data: { url?: string; configured?: boolean; message?: string } }>('/tasks/calendar/auth-url').then((r) => r.data.data),
};
