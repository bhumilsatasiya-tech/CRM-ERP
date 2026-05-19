export type LoanType = 'borrowed' | 'given';
export type LoanStatus = 'draft' | 'active' | 'closed' | 'cancelled';
export type EmiStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface LoanEmi {
  id: number;
  installment_no: number;
  due_date: string;
  principal_component: number;
  interest_component: number;
  emi_amount: number;
  paid_amount: number;
  status: EmiStatus;
}

export interface LoanPayment {
  id: number;
  payment_date: string;
  amount: number;
  mode: string;
  bank_ref?: string | null;
  notes?: string | null;
}

export interface Loan {
  id: number;
  company_id: number;
  code: string;
  type: LoanType;
  partner_id?: number | null;
  partner?: { id: number; code: string; name: string } | null;
  principal: number;
  interest_rate_pct: number;
  tenure_months: number;
  start_date: string;
  emi_amount: number;
  total_payable: number;
  total_interest: number;
  outstanding_principal: number;
  status: LoanStatus;
  schedule?: LoanEmi[];
  payments?: LoanPayment[];
  notes?: string | null;
}
