import { apiClient } from '../../01-auth/api/axiosInstance';
import type { TrackingDashboardRow, TrackingTimeline } from '../types/tracking.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

export const trackingApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiClient.get<Paginated<TrackingDashboardRow>>('/tracking', { params }).then((r) => r.data),
  getSalesOrder: (id: number) =>
    apiClient.get<{ data: TrackingTimeline }>(`/tracking/sales-orders/${id}`).then((r) => r.data.data),
};
