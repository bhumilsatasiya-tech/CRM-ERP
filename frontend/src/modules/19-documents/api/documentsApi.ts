import { apiClient } from '../../01-auth/api/axiosInstance';
import type { DocumentRow } from '../types/documents.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

export const documentsApi = {
  list: (params: Record<string, unknown> = {}) => apiClient.get<Paginated<DocumentRow>>('/documents', { params }).then((r) => r.data),
  upload: (formData: FormData) => apiClient.post<{ data: DocumentRow }>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data),
  remove: (id: number) => apiClient.delete<{ data: { message: string } }>(`/documents/${id}`).then((r) => r.data.data),
  downloadUrl: (id: number) => `${apiClient.defaults.baseURL}/documents/${id}/download`,
};
