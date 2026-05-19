export type SOStatus = 'draft' | 'submitted' | 'approved' | 'in_production' | 'partial' | 'invoiced' | 'cancelled' | 'closed';
export type InvoiceStatus = 'draft' | 'posted' | 'partially_paid' | 'paid' | 'cancelled';
export type DocTaxType = 'cgst_sgst' | 'igst' | 'none';

interface MiniPartner { id: number; code: string; name: string }
interface MiniWarehouse { id: number; code: string; name: string }
interface MiniProduct { id: number; code: string; name: string }

export interface SOLine {
  id?: number; product_id: number; product?: MiniProduct;
  hsn_code?: string | null;
  qty: number; rate: number; discount_pct: number; tax_rate: number;
  line_subtotal: number; tax_amount: number; line_total: number;
  invoiced_qty?: number;
  notes?: string | null;
}

export interface SOLinkedBatch {
  id: number; code: string; status: string;
  qty_planned: number; qty_produced: number; qty_failed: number;
  completed_at?: string | null;
}
export interface SOLinkedInvoice {
  id: number; code: string; status: InvoiceStatus;
  invoice_date: string;
  total: number; paid_amount: number; balance: number;
}
export interface SOLinkedQuotation {
  id: number; code: string; status: string;
}

export interface SalesOrder {
  id: number; company_id: number; code: string;
  partner_id: number; partner?: MiniPartner;
  warehouse_id?: number | null; warehouse?: MiniWarehouse;
  quotation_id?: number | null;
  order_date: string; expected_delivery_date?: string | null;
  reference?: string | null;
  currency: string; exchange_rate: number;
  subtotal: number; tax_amount: number; discount: number; shipping: number; total: number;
  tax_type?: DocTaxType; cgst_amount?: number; sgst_amount?: number; igst_amount?: number;
  invoiced_amount: number;
  status: SOStatus;
  terms_and_conditions?: string | null; notes?: string | null;
  lines?: SOLine[]; lines_count?: number;

  // Cross-module summaries (only present on detail fetch)
  quotation?: SOLinkedQuotation | null;
  production_batches?: SOLinkedBatch[];
  invoices?: SOLinkedInvoice[];
}

export interface InvoiceLine {
  id?: number; sales_order_item_id?: number | null;
  product_id: number; product?: MiniProduct;
  hsn_code?: string | null;
  qty: number; rate: number; discount_pct: number; tax_rate: number;
  line_subtotal: number; tax_amount: number; line_total: number;
  batch_no?: string | null; expiry_date?: string | null;
  ledger_id?: number | null; notes?: string | null;
}

export interface InvoicePayment {
  id: number;
  payment_date: string;
  amount: number;
  mode: string;
  reference?: string | null;
  notes?: string | null;
}

export interface Invoice {
  id: number; company_id: number; code: string;
  partner_id: number; partner?: MiniPartner;
  sales_order_id?: number | null;
  warehouse_id: number; warehouse?: MiniWarehouse;
  invoice_date: string; due_date?: string | null;
  reference?: string | null;
  currency: string; exchange_rate: number;
  subtotal: number; tax_amount: number; discount: number; shipping: number;
  total: number; paid_amount: number; balance: number;
  tax_type?: DocTaxType; cgst_amount?: number; sgst_amount?: number; igst_amount?: number;
  status: InvoiceStatus;
  posted_at?: string | null;
  terms_and_conditions?: string | null; notes?: string | null;
  lines?: InvoiceLine[]; payments?: InvoicePayment[]; lines_count?: number;
}
