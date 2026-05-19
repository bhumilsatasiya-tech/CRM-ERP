import { apiClient } from '../../01-auth/api/axiosInstance';
import type { Designation, Employee, SalaryComponent, SalaryRun } from '../types/hr.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

export const employeeApi = {
  list: (params: Record<string, unknown> = {}) => apiClient.get<Paginated<Employee>>('/employees', { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<{ data: Employee }>(`/employees/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => apiClient.post<{ data: Employee }>('/employees', payload).then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Employee }>(`/employees/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) => apiClient.delete<{ data: { message: string } }>(`/employees/${id}`).then((r) => r.data.data),
  setStructure: (id: number, payload: Record<string, unknown>) =>
    apiClient.post<{ data: Employee }>(`/employees/${id}/salary-structure`, payload).then((r) => r.data.data),
};

export const designationApi = {
  list: () => apiClient.get<{ data: Designation[] }>('/designations').then((r) => r.data.data),
  create: (payload: { code: string; name: string; notes?: string }) =>
    apiClient.post<{ data: Designation }>('/designations', payload).then((r) => r.data.data),
  update: (id: number, payload: Partial<Designation>) => apiClient.patch<{ data: Designation }>(`/designations/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) => apiClient.delete<{ data: { message: string } }>(`/designations/${id}`).then((r) => r.data.data),
};

export const salaryComponentApi = {
  list: () => apiClient.get<{ data: SalaryComponent[] }>('/salary-components').then((r) => r.data.data),
  create: (payload: Partial<SalaryComponent>) => apiClient.post<{ data: SalaryComponent }>('/salary-components', payload).then((r) => r.data.data),
  update: (id: number, payload: Partial<SalaryComponent>) => apiClient.patch<{ data: SalaryComponent }>(`/salary-components/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) => apiClient.delete<{ data: { message: string } }>(`/salary-components/${id}`).then((r) => r.data.data),
};

export const salaryRunApi = {
  list: (params: Record<string, unknown> = {}) => apiClient.get<Paginated<SalaryRun>>('/salary-runs', { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<{ data: SalaryRun }>(`/salary-runs/${id}`).then((r) => r.data.data),
  create: (period: string) => apiClient.post<{ data: SalaryRun }>('/salary-runs', { period }).then((r) => r.data.data),
  recompute: (id: number) => apiClient.put<{ data: SalaryRun }>(`/salary-runs/${id}`, {}).then((r) => r.data.data),
  remove: (id: number) => apiClient.delete<{ data: { message: string } }>(`/salary-runs/${id}`).then((r) => r.data.data),
  post: (id: number) => apiClient.post<{ data: SalaryRun }>(`/salary-runs/${id}/post`).then((r) => r.data.data),
  cancel: (id: number) => apiClient.post<{ data: SalaryRun }>(`/salary-runs/${id}/cancel`).then((r) => r.data.data),
  markPaid: (id: number, payslipId: number, paymentRef: string) =>
    apiClient.post<{ data: SalaryRun }>(`/salary-runs/${id}/payslips/${payslipId}/mark-paid`, { payment_ref: paymentRef }).then((r) => r.data.data),
};
