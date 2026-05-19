import { apiClient } from '../../01-auth/api/axiosInstance';
import type {
  CreateWarehousePayload,
  UpdateWarehousePayload,
  Warehouse,
} from '../types/companies.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export const warehouseApi = {
  list: (
    companyId: number,
    params: { search?: string; type?: string; is_active?: boolean; page?: number; per_page?: number } = {},
  ) =>
    apiClient
      .get<PaginatedEnvelope<Warehouse>>(`/companies/${companyId}/warehouses`, { params })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient.get<{ data: Warehouse }>(`/warehouses/${id}`).then((r) => r.data.data),

  create: (companyId: number, payload: CreateWarehousePayload) =>
    apiClient
      .post<{ data: Warehouse }>(`/companies/${companyId}/warehouses`, payload)
      .then((r) => r.data.data),

  update: (id: number, payload: UpdateWarehousePayload) =>
    apiClient.put<{ data: Warehouse }>(`/warehouses/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/warehouses/${id}`).then((r) => r.data.data),
};
