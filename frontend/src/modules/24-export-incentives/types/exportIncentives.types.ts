export type IncentiveType = 'drawback' | 'igst_refund' | 'rodtep';
export type IncentiveStatus = 'pending' | 'filed' | 'approved' | 'credited' | 'rejected';

export interface ExportIncentiveClaim {
  id: number;
  company_id: number;
  type: IncentiveType;
  shipping_bill_id?: number | null;
  shipping_bill?: { id: number; code: string } | null;
  export_invoice_id?: number | null;
  export_invoice?: { id: number; code: string } | null;
  claim_no?: string | null;
  claim_date: string;
  claim_amount: number;
  claim_currency: string;
  status: IncentiveStatus;
  credited_amount?: number | null;
  credited_date?: string | null;
  bank_ref?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateClaimPayload {
  type: IncentiveType;
  shipping_bill_id?: number | null;
  export_invoice_id?: number | null;
  claim_no?: string;
  claim_date: string;
  claim_amount: number;
  claim_currency?: string;
  status?: IncentiveStatus;
  notes?: string;
}
