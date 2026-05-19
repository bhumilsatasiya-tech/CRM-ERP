import { apiClient } from '../../01-auth/api/axiosInstance';
import type { Account, JournalEntry, LedgerRow, TrialBalanceRow } from '../types/finance.types';

interface Paginated<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }

export const accountApi = {
  list:    (params: Record<string, unknown> = {}) => apiClient.get<Paginated<Account>>('/accounts', { params }).then((r) => r.data),
  get:     (id: number) => apiClient.get<{ data: Account }>(`/accounts/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: Account }>('/accounts', payload).then((r) => r.data.data),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: Account }>(`/accounts/${id}`, payload).then((r) => r.data.data),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/accounts/${id}`).then((r) => r.data.data),
};

export const journalApi = {
  list:    (params: Record<string, unknown> = {}) => apiClient.get<Paginated<JournalEntry>>('/journal-entries', { params }).then((r) => r.data),
  get:     (id: number) => apiClient.get<{ data: JournalEntry }>(`/journal-entries/${id}`).then((r) => r.data.data),
  create:  (payload: Record<string, unknown>) => apiClient.post<{ data: JournalEntry }>('/journal-entries', payload).then((r) => r.data.data),
  update:  (id: number, payload: Record<string, unknown>) => apiClient.put<{ data: JournalEntry }>(`/journal-entries/${id}`, payload).then((r) => r.data.data),
  remove:  (id: number) => apiClient.delete<{ data: { message: string } }>(`/journal-entries/${id}`).then((r) => r.data.data),
  post:    (id: number) => apiClient.post<{ data: JournalEntry }>(`/journal-entries/${id}/post`).then((r) => r.data.data),
  cancel:  (id: number, reason?: string) => apiClient.post<{ data: JournalEntry }>(`/journal-entries/${id}/cancel`, { reason }).then((r) => r.data.data),
};

export const reportApi = {
  trialBalance: (from: string, to: string) =>
    apiClient.get<{ data: { from: string; to: string; rows: TrialBalanceRow[] } }>('/finance/trial-balance', { params: { from, to } }).then((r) => r.data.data),
  ledger: (accountId: number, from: string, to: string) =>
    apiClient.get<{ data: { opening: number; closing: number; rows: LedgerRow[] } }>(`/finance/ledger/${accountId}`, { params: { from, to } }).then((r) => r.data.data),
};

export interface PartnerStatementRow {
  date: string;
  type: 'invoice' | 'invoice_payment' | 'purchase_invoice' | 'export_invoice' | 'irm';
  ref_id: number;
  ref_code: string;
  narration: string;
  currency: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface PartnerStatement {
  partner: { id: number; code: string; name: string; type: string; country?: string; currency?: string; credit_limit: number };
  period: { from: string; to: string };
  opening_balance: number;
  rows: PartnerStatementRow[];
  closing_balance: number;
  totals: { total_debit: number; total_credit: number; net: number };
}

export const partnerStatementApi = {
  get: (partnerId: number, from: string, to: string) =>
    apiClient.get<{ data: PartnerStatement }>(`/partners/${partnerId}/statement`, { params: { from, to } }).then((r) => r.data.data),
};
