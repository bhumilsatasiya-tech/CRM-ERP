export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type JournalStatus = 'draft' | 'posted' | 'cancelled';

export interface Account {
  id: number;
  company_id: number;
  code: string;
  name: string;
  type: AccountType;
  parent_id?: number | null;
  is_group: boolean;
  is_system: boolean;
  notes?: string | null;
}

export interface JournalLine {
  id?: number;
  account_id: number;
  account?: { id: number; code: string; name: string; type: AccountType } | null;
  debit: number;
  credit: number;
  narration?: string | null;
}

export interface JournalEntry {
  id: number;
  company_id: number;
  code: string;
  entry_date: string;
  narration?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_no?: string | null;
  total_debit: number;
  total_credit: number;
  status: JournalStatus;
  posted_at?: string | null;
  cancelled_at?: string | null;
  lines?: JournalLine[];
  lines_count?: number;
  created_at?: string;
}

export interface TrialBalanceRow {
  account_id: number;
  code: string;
  name: string;
  type: AccountType;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

export interface LedgerRow {
  entry_id: number;
  entry_code: string;
  entry_date: string;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_no?: string | null;
  narration?: string | null;
  debit: number;
  credit: number;
  balance: number;
}
