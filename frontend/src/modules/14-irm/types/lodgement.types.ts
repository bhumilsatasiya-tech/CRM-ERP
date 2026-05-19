export type LodgementStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'cancelled';
export type UtilizationStatus = 'pending' | 'utilised' | 'unutilised' | 'rejected';

interface MiniPartner { id: number; code: string; name: string }

export interface LodgementRow {
  id: number;
  irm_id: number;
  irm?: {
    id: number;
    code: string;
    currency: string;
    outstanding_amount_fcy: number;
    irm_date?: string | null;
    partner_id?: number | null;
    partner_code?: string | null;
    partner_name?: string | null;
    remitter_name?: string | null;
    bank_ref_no?: string | null;
  } | null;
  export_invoice_id: number;
  export_invoice?: { id: number; code: string; total: number; balance: number } | null;
  amount_fcy: number;
  amount_inr: number;
  exchange_rate: number;
  allocation_date?: string | null;
  is_full_realization: boolean;
  is_third_party_payment: boolean;
  utilization_status: UtilizationStatus;
  utilization_note?: string | null;
  notes?: string | null;
}

export interface Lodgement {
  id: number;
  company_id: number;
  code: string;
  partner_id?: number | null;
  partner?: MiniPartner | null;
  lodgement_date: string;
  bank_receipt_no?: string | null;
  bank_receipt_date?: string | null;
  status: LodgementStatus;
  rejection_reason?: string | null;
  notes?: string | null;
  allocations?: LodgementRow[];
  allocations_count?: number;
  created_at?: string;
  updated_at?: string;
}
