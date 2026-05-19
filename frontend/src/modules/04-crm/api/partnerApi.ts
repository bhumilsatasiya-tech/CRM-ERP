import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedFetch, cachedList, invalidate } from '../../common/lookupCache';
import { invalidateStore } from '../../../app/lookupStore';
import type {
  Partner,
  PartnerAddress,
  PartnerBankAccount,
  PartnerContact,
  CreatePartnerPayload,
  UpdatePartnerPayload,
  CreatePartnerContactPayload,
  CreatePartnerAddressPayload,
  CreatePartnerBankPayload,
} from '../types/crm.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

const flushPartnerCaches = () => {
  invalidate('lookup:partners');
  invalidate('list:partners');
  invalidateStore('partners');
};

export const partnerApi = {
  list: (params: { search?: string; type?: string; segment?: string; is_active?: boolean; page?: number; per_page?: number; sort?: string } = {}) =>
    cachedList('list:partners', params, () => apiClient.get<PaginatedEnvelope<Partner>>('/partners', { params }).then((r) => r.data)),

  get: (id: number) =>
    apiClient.get<{ data: Partner }>(`/partners/${id}`).then((r) => r.data.data),

  create: (payload: CreatePartnerPayload) =>
    apiClient.post<{ data: Partner }>('/partners', payload).then((r) => { flushPartnerCaches(); return r.data.data; }),

  update: (id: number, payload: UpdatePartnerPayload) =>
    apiClient.put<{ data: Partner }>(`/partners/${id}`, payload).then((r) => { flushPartnerCaches(); return r.data.data; }),

  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/partners/${id}`).then((r) => { flushPartnerCaches(); return r.data.data; }),

  lookup: (q: string, type?: string, limit = 10, offset = 0) => {
    const key = `lookup:partners:t=${type ?? ''}:q=${q}:o=${offset}:l=${limit}`;
    return cachedFetch(key, () =>
      apiClient
        .get<{ data: Partial<Partner>[] }>('/lookup/partners', { params: { q, type, limit, offset } })
        .then((r) => r.data.data),
    );
  },
};

export const partnerContactApi = {
  list: (partnerId: number) =>
    apiClient.get<{ data: PartnerContact[] }>(`/partners/${partnerId}/contacts`).then((r) => r.data.data),
  create: (partnerId: number, payload: CreatePartnerContactPayload) =>
    apiClient.post<{ data: PartnerContact }>(`/partners/${partnerId}/contacts`, payload).then((r) => r.data.data),
  update: (id: number, payload: CreatePartnerContactPayload) =>
    apiClient.put<{ data: PartnerContact }>(`/partner-contacts/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/partner-contacts/${id}`).then((r) => r.data.data),
};

export const partnerAddressApi = {
  list: (partnerId: number) =>
    apiClient.get<{ data: PartnerAddress[] }>(`/partners/${partnerId}/addresses`).then((r) => r.data.data),
  create: (partnerId: number, payload: CreatePartnerAddressPayload) =>
    apiClient.post<{ data: PartnerAddress }>(`/partners/${partnerId}/addresses`, payload).then((r) => r.data.data),
  update: (id: number, payload: CreatePartnerAddressPayload) =>
    apiClient.put<{ data: PartnerAddress }>(`/partner-addresses/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/partner-addresses/${id}`).then((r) => r.data.data),
};

export const partnerBankApi = {
  list: (partnerId: number) =>
    apiClient.get<{ data: PartnerBankAccount[] }>(`/partners/${partnerId}/bank-accounts`).then((r) => r.data.data),
  create: (partnerId: number, payload: CreatePartnerBankPayload) =>
    apiClient.post<{ data: PartnerBankAccount }>(`/partners/${partnerId}/bank-accounts`, payload).then((r) => r.data.data),
  update: (id: number, payload: CreatePartnerBankPayload) =>
    apiClient.put<{ data: PartnerBankAccount }>(`/partner-bank-accounts/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/partner-bank-accounts/${id}`).then((r) => r.data.data),
};
