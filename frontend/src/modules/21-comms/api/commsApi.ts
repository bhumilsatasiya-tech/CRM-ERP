import { apiClient } from '../../01-auth/api/axiosInstance';
import type { CommMessage, CommTemplate } from '../types/comms.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

export const commsApi = {
  sendEmail: (payload: { to: string; subject: string; body: string; related_type?: string; related_id?: number }) =>
    apiClient.post<{ data: CommMessage }>('/comm/email', payload).then((r) => r.data.data),
  sendWhatsApp: (payload: { to: string; body: string; related_type?: string; related_id?: number }) =>
    apiClient.post<{ data: CommMessage }>('/comm/whatsapp', payload).then((r) => r.data.data),
  messages: (params: Record<string, unknown> = {}) => apiClient.get<Paginated<CommMessage>>('/comm/messages', { params }).then((r) => r.data),

  templates: () => apiClient.get<{ data: CommTemplate[] }>('/comm/templates').then((r) => r.data.data),
  saveTemplate: (payload: Partial<CommTemplate>) => apiClient.post<{ data: CommTemplate }>('/comm/templates', payload).then((r) => r.data.data),
  updateTemplate: (id: number, payload: Partial<CommTemplate>) => apiClient.patch<{ data: CommTemplate }>(`/comm/templates/${id}`, payload).then((r) => r.data.data),
  removeTemplate: (id: number) => apiClient.delete<{ data: { message: string } }>(`/comm/templates/${id}`).then((r) => r.data.data),
};
