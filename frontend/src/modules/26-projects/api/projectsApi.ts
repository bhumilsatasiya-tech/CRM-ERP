import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { CostEntryPayload, CreateProjectPayload, Project, ProjectCostEntry, ProjectSummary } from '../types/projects.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flush = () => invalidate('list:projects');

export const projectsApi = {
  list: (params: Record<string, unknown> = {}) =>
    cachedList('list:projects', params, () => apiClient.get<Paginated<Project>>('/projects', { params }).then((r) => r.data)),
  get: (id: number) =>
    apiClient.get<{ data: Project }>(`/projects/${id}`).then((r) => r.data.data),
  create: (payload: CreateProjectPayload) =>
    apiClient.post<{ data: Project }>('/projects', payload).then((r) => { flush(); return r.data.data; }),
  update: (id: number, payload: CreateProjectPayload) =>
    apiClient.put<{ data: Project }>(`/projects/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/projects/${id}`).then((r) => { flush(); return r.data.data; }),
  summary: (id: number) =>
    apiClient.get<{ data: ProjectSummary }>(`/projects/${id}/summary`).then((r) => r.data.data),
  addEntry: (projectId: number, payload: CostEntryPayload) =>
    apiClient.post<{ data: ProjectCostEntry }>(`/projects/${projectId}/cost-entries`, payload).then((r) => { flush(); return r.data.data; }),
  updateEntry: (projectId: number, entryId: number, payload: CostEntryPayload) =>
    apiClient.put<{ data: ProjectCostEntry }>(`/projects/${projectId}/cost-entries/${entryId}`, payload).then((r) => { flush(); return r.data.data; }),
  deleteEntry: (projectId: number, entryId: number) =>
    apiClient.delete<{ data: { message: string } }>(`/projects/${projectId}/cost-entries/${entryId}`).then((r) => { flush(); return r.data.data; }),
};
