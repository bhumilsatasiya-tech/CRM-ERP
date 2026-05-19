export type IrmStatus = 'received' | 'partially_allocated' | 'allocated' | 'closed' | 'cancelled';
export type IrmPurpose = 'advance' | 'against_invoice';

interface MiniPartner { id: number; code: string; name: string }

export interface IrmAllocation {
  id: number;
  export_invoice_id: number;
  export_invoice?: { id: number; code: string; total: number; balance: number } | null;
  shipping_bill_id?: number | null;
  amount_fcy: number;
  amount_inr: number;
  allocation_date?: string | null;
  exchange_rate: number;
  is_full_realization: boolean;
  notes?: string | null;
}

export interface BankRealization {
  id: number;
  realization_date: string;
  bank_ref?: string | null;
  commission: number;
  tds: number;
  net_inr: number;
  notes?: string | null;
}

export interface Irm {
  id: number;
  company_id: number;
  code: string;

  partner_id?: number | null;
  partner?: MiniPartner | null;

  export_invoice_id?: number | null;
  export_invoice?: { id: number; code: string; currency: string; total: number; paid_amount: number; balance: number } | null;

  purpose: IrmPurpose;
  purchase_order_ref?: string | null;
  proforma_invoice_no?: string | null;
  bank_name?: string | null;
  remitter_name?: string | null;
  bank_ref_no?: string | null;
  irm_date: string;

  irm_amount_fcy: number;
  outstanding_amount_fcy: number;
  irm_currency: string;
  exchange_rate: number;
  irm_amount_inr: number;
  outstanding_amount_inr: number;

  purpose_code?: string | null;
  status: IrmStatus;
  allocations?: IrmAllocation[];
  realizations?: BankRealization[];
  notes?: string | null;
}
