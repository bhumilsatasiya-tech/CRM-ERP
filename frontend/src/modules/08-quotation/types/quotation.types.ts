export type QuotationStatus = 'draft' | 'submitted' | 'approved' | 'converted' | 'expired' | 'cancelled';

interface MiniPartner { id: number; code: string; name: string }
interface MiniProduct { id: number; code: string; name: string }

export interface QLine {
  id?: number; product_id: number; product?: MiniProduct;
  hsn_code?: string | null;
  qty: number; rate: number;
  discount_pct: number; tax_rate: number;
  line_subtotal: number; tax_amount: number; line_total: number;
  notes?: string | null;
}

export interface Quotation {
  id: number; company_id: number; code: string;
  partner_id: number; partner?: MiniPartner;
  quotation_date: string; valid_until?: string | null;
  reference?: string | null;
  currency: string; exchange_rate: number;
  subtotal: number; tax_amount: number; discount: number; shipping: number; total: number;
  tax_type?: 'cgst_sgst' | 'igst' | 'none'; cgst_amount?: number; sgst_amount?: number; igst_amount?: number;
  status: QuotationStatus;
  converted_to_sales_order_id?: number | null;
  terms_and_conditions?: string | null;
  notes?: string | null;
  lines?: QLine[];
  lines_count?: number;
}
