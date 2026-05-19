import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { Loan, LoanPayment } from '../types/loans.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flush = () => invalidate('list:loans');

export const loansApi = {
  list: (params: Record<string, unknown> = {}) =>
    cachedList('list:loans', params, () => apiClient.get<Paginated<Loan>>('/loans', { params }).then((r) => r.data)),
  get: (id: number) => apiClient.get<{ data: Loan }>(`/loans/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => apiClient.post<{ data: Loan }>('/loans', payload).then((r) => { flush(); return r.data.data; }),
  update: (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Loan }>(`/loans/${id}`, payload).then((r) => { flush(); return r.data.data; }),
  remove: (id: number) => apiClient.delete<{ data: { message: string } }>(`/loans/${id}`).then((r) => { flush(); return r.data.data; }),
  recordPayment: (id: number, payload: Partial<LoanPayment> & { amount: number }) =>
    apiClient.post<{ data: { payment_id: number; loan: Loan } }>(`/loans/${id}/payments`, payload).then((r) => { flush(); return r.data.data; }),
  cancel: (id: number) => apiClient.post<{ data: Loan }>(`/loans/${id}/cancel`).then((r) => { flush(); return r.data.data; }),
};
