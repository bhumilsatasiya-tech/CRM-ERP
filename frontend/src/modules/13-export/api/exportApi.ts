import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedList, invalidate } from '../../common/lookupCache';
import type { ExportInvoice, ShippingBill } from '../types/export.types';
import type { PackingList } from '../types/packingList.types';
import type { TaxInvoice } from '../types/taxInvoice.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

const flushEI = () => invalidate('list:export-invoices');
const flushSB = () => invalidate('list:shipping-bills');
const flushPL = () => invalidate('list:packing-lists');
const flushTI = () => invalidate('list:tax-invoices');

export const exportInvoiceApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:export-invoices', params, () => apiClient.get<Paginated<ExportInvoice>>('/export-invoices', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: ExportInvoice }>(`/export-invoices/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: ExportInvoice }>('/export-invoices', payload).then((r) => { flushEI(); flushPL(); flushTI(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: ExportInvoice }>(`/export-invoices/${id}`, payload).then((r) => { flushEI(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/export-invoices/${id}`).then((r) => { flushEI(); return r.data.data; }),
  post:    (id: number) => apiClient.post<{ data: ExportInvoice }>(`/export-invoices/${id}/post`).then((r) => { flushEI(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: ExportInvoice }>(`/export-invoices/${id}/cancel`, { reason }).then((r) => { flushEI(); return r.data.data; }),
  ensureCompanionDocs: (id: number) => apiClient.post<{ data: ExportInvoice }>(`/export-invoices/${id}/companion-docs`).then((r) => { flushPL(); flushTI(); return r.data.data; }),
};

export const shippingBillApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:shipping-bills', params, () => apiClient.get<Paginated<ShippingBill>>('/shipping-bills', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: ShippingBill }>(`/shipping-bills/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: ShippingBill }>('/shipping-bills', payload).then((r) => { flushSB(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: ShippingBill }>(`/shipping-bills/${id}`, payload).then((r) => { flushSB(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/shipping-bills/${id}`).then((r) => { flushSB(); return r.data.data; }),
  dispatch:(id: number) => apiClient.post<{ data: ShippingBill }>(`/shipping-bills/${id}/dispatch`).then((r) => { flushSB(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: ShippingBill }>(`/shipping-bills/${id}/cancel`, { reason }).then((r) => { flushSB(); return r.data.data; }),
  /**
   * OCR-extract structured fields from a Shipping Bill PDF/image. Backend uses the
   * configured OCR_PROVIDER_CLASS; if unconfigured this returns a 503 with a friendly
   * "Set OCR_PROVIDER first" message.
   */
  extractFromPdf: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ data: Record<string, unknown> }>('/shipping-bills/extract-from-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
  },
};

export const packingListApi = {
  list:     (params: Record<string, unknown> = {}) =>
    cachedList('list:packing-lists', params, () => apiClient.get<Paginated<PackingList>>('/packing-lists', { params }).then((r) => r.data)),
  get:      (id: number) => apiClient.get<{ data: PackingList }>(`/packing-lists/${id}`).then((r) => r.data.data),
  create:   (payload: Record<string, unknown>) => apiClient.post<{ data: PackingList }>('/packing-lists', payload).then((r) => { flushPL(); return r.data.data; }),
  update:   (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: PackingList }>(`/packing-lists/${id}`, payload).then((r) => { flushPL(); return r.data.data; }),
  remove:   (id: number) => apiClient.delete<{ data: { message: string } }>(`/packing-lists/${id}`).then((r) => { flushPL(); return r.data.data; }),
  finalize: (id: number) => apiClient.post<{ data: PackingList }>(`/packing-lists/${id}/finalize`).then((r) => { flushPL(); return r.data.data; }),
  cancel:   (id: number, reason?: string) => apiClient.post<{ data: PackingList }>(`/packing-lists/${id}/cancel`, { reason }).then((r) => { flushPL(); return r.data.data; }),
};

export const taxInvoiceApi = {
  list:    (params: Record<string, unknown> = {}) =>
    cachedList('list:tax-invoices', params, () => apiClient.get<Paginated<TaxInvoice>>('/tax-invoices', { params }).then((r) => r.data)),
  get:     (id: number) => apiClient.get<{ data: TaxInvoice }>(`/tax-invoices/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: TaxInvoice }>('/tax-invoices', payload).then((r) => { flushTI(); return r.data.data; }),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: TaxInvoice }>(`/tax-invoices/${id}`, payload).then((r) => { flushTI(); return r.data.data; }),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/tax-invoices/${id}`).then((r) => { flushTI(); return r.data.data; }),
  post:    (id: number) => apiClient.post<{ data: TaxInvoice }>(`/tax-invoices/${id}/post`).then((r) => { flushTI(); return r.data.data; }),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: TaxInvoice }>(`/tax-invoices/${id}/cancel`, { reason }).then((r) => { flushTI(); return r.data.data; }),
};
