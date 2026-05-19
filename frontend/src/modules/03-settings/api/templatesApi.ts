import { apiClient } from '../../01-auth/api/axiosInstance';

export interface DocumentTemplate {
  id: number;
  company_id: number;
  doc_type: string;
  name: string;
  html: string;
  css?: string | null;
  paper_size: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  is_default: boolean;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateTemplatePayload {
  doc_type?: string;
  name?: string;
  html?: string;
  css?: string | null;
  paper_size?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  is_default?: boolean;
  is_active?: boolean;
  notes?: string;
}

export const documentTemplateApi = {
  list: (params: { company_id?: number; doc_type?: string } = {}) =>
    apiClient.get<{ data: DocumentTemplate[] }>('/document-templates', { params }).then((r) => r.data.data),

  get: (id: number) =>
    apiClient.get<{ data: DocumentTemplate }>(`/document-templates/${id}`).then((r) => r.data.data),

  create: (payload: UpdateTemplatePayload) =>
    apiClient.post<{ data: DocumentTemplate }>('/document-templates', payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateTemplatePayload) =>
    apiClient.put<{ data: DocumentTemplate }>(`/document-templates/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/document-templates/${id}`).then((r) => r.data.data),

  /** Render the template against MOCK data and return rendered HTML (for the editor preview). */
  preview: (id: number) =>
    apiClient.get<{ data: { html: string } }>(`/document-templates/${id}/preview`).then((r) => r.data.data),

  makeDefault: (id: number) =>
    apiClient.post<{ data: DocumentTemplate }>(`/document-templates/${id}/default`).then((r) => r.data.data),
};
