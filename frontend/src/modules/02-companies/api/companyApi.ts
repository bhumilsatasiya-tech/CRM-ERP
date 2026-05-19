import { apiClient } from '../../01-auth/api/axiosInstance';
import type {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from '../types/companies.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export const companyApi = {
  list: (params: { search?: string; type?: string; is_active?: boolean; page?: number; per_page?: number } = {}) =>
    apiClient.get<PaginatedEnvelope<Company>>('/companies', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<{ data: Company }>(`/companies/${id}`).then((r) => r.data.data),

  create: (payload: CreateCompanyPayload) =>
    apiClient.post<{ data: Company }>('/companies', payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateCompanyPayload) =>
    apiClient.put<{ data: Company }>(`/companies/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/companies/${id}`).then((r) => r.data.data),

  myCompanies: () =>
    apiClient
      .get<{ data: Company[]; meta: { default_company_id: number | null; has_all_companies_access: boolean } }>(
        '/me/companies',
      )
      .then((r) => r.data),

  setActive: (companyId: number) =>
    apiClient
      .post<{ data: { message: string; company_id: number } }>('/me/active-company', { company_id: companyId })
      .then((r) => r.data.data),
};
