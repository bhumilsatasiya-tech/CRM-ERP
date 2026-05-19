import { apiClient } from '../../01-auth/api/axiosInstance';

export interface OpenInvoiceRow {
  id: number;
  code: string;
  invoice_date: string;
  due_date?: string | null;
  total: number;
  paid_amount: number;
  balance: number;
  currency: string;
  status: string;
}

export interface OpenInvoicesResp {
  rows: OpenInvoiceRow[];
  total_outstanding: number;
  count: number;
}

export interface VoucherPayload {
  partner_id: number;
  amount: number;
  payment_date?: string;
  mode?: string;
  reference?: string;
  notes?: string;
}

export interface BankOrExpensePayload {
  amount: number;
  account_id: number;     // counter-account (for bank receipt) or expense account (for expense)
  payment_date?: string;
  mode?: 'bank' | 'cash';
  reference?: string;
  notes?: string;
}

export interface ContraPayload {
  amount: number;
  from_account_id: number;
  to_account_id: number;
  payment_date?: string;
  reference?: string;
  notes?: string;
}

export const voucherApi = {
  openInvoices: (partnerId: number, type: 'sales' | 'purchase') =>
    apiClient.get<{ data: OpenInvoicesResp }>('/vouchers/open-invoices', { params: { partner_id: partnerId, type } }).then((r) => r.data.data),
  supplierPayment: (payload: VoucherPayload) =>
    apiClient.post<{ data: { payments_created: number; payment_ids: number[]; total_applied: number } }>('/vouchers/supplier-payment', payload).then((r) => r.data.data),
  buyerReceipt: (payload: VoucherPayload) =>
    apiClient.post<{ data: { payments_created: number; payment_ids: number[]; total_applied: number } }>('/vouchers/buyer-receipt', payload).then((r) => r.data.data),
  bankReceipt: (payload: BankOrExpensePayload) =>
    apiClient.post<{ data: { journal_entry_id: number; code: string } }>('/vouchers/bank-receipt', payload).then((r) => r.data.data),
  expense: (payload: BankOrExpensePayload) =>
    apiClient.post<{ data: { journal_entry_id: number; code: string } }>('/vouchers/expense', payload).then((r) => r.data.data),
  contra: (payload: ContraPayload) =>
    apiClient.post<{ data: { journal_entry_id: number; code: string } }>('/vouchers/contra', payload).then((r) => r.data.data),
};
