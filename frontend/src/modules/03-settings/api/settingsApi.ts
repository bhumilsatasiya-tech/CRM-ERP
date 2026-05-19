import { apiClient } from '../../01-auth/api/axiosInstance';
import type { AuditLog, Sequence, Setting, CreateSequencePayload, UpdateSequencePayload } from '../types/settings.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export const settingsApi = {
  list: (params: { scope?: string; scope_id?: number; group?: string; search?: string } = {}) =>
    apiClient.get<{ data: Setting[] }>('/settings', { params }).then((r) => r.data.data),

  get: (id: number) =>
    apiClient.get<{ data: Setting }>(`/settings/${id}`).then((r) => r.data.data),

  update: (id: number, value: unknown) =>
    apiClient.put<{ data: Setting }>(`/settings/${id}`, { value }).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/settings/${id}`).then((r) => r.data.data),

  mySettings: () =>
    apiClient.get<{ data: Setting[] }>('/me/settings').then((r) => r.data.data),
};

export const sequenceApi = {
  list: (params: { company_id?: number; search?: string } = {}) =>
    apiClient.get<{ data: Sequence[] }>('/sequences', { params }).then((r) => r.data.data),

  get: (id: number) =>
    apiClient.get<{ data: Sequence }>(`/sequences/${id}`).then((r) => r.data.data),

  create: (payload: CreateSequencePayload) =>
    apiClient.post<{ data: Sequence }>('/sequences', payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateSequencePayload) =>
    apiClient.put<{ data: Sequence }>(`/sequences/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/sequences/${id}`).then((r) => r.data.data),

  previewNext: (id: number) =>
    apiClient
      .get<{ data: { doc_type: string; next_preview: string } }>(`/sequences/${id}/preview-next`)
      .then((r) => r.data.data),

  /** Preview the next code for the active company's sequence of a doc_type. */
  previewByDocType: (docType: string, companyId?: number) =>
    apiClient
      .get<{ data: { company_id: number; doc_type: string; next_preview: string | null } }>(
        '/sequences/preview',
        { params: { doc_type: docType, company_id: companyId } },
      )
      .then((r) => r.data.data),
};

export const auditLogApi = {
  list: (
    params: {
      log_name?: string;
      event?: string;
      subject_type?: string;
      subject_id?: number;
      causer_id?: number;
      from?: string;
      to?: string;
      search?: string;
      page?: number;
      per_page?: number;
    } = {},
  ) => apiClient.get<PaginatedEnvelope<AuditLog>>('/audit-logs', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<{ data: AuditLog }>(`/audit-logs/${id}`).then((r) => r.data.data),
};
