export type POStatus = 'draft' | 'submitted' | 'approved' | 'partial' | 'received' | 'cancelled' | 'closed';
export type GrnStatus = 'draft' | 'received' | 'cancelled';
export type PIStatus = 'draft' | 'posted' | 'partially_paid' | 'paid' | 'cancelled';

interface MiniPartner { id: number; code: string; name: string }
interface MiniWarehouse { id: number; code: string; name: string }
interface MiniProduct { id: number; code: string; name: string }

export interface POLine {
  id?: number; product_id: number; product?: MiniProduct;
  hsn_code?: string | null;
  unit_id?: number | null;
  qty: number; rate: number;
  discount_pct: number; tax_rate: number;
  line_subtotal: number; tax_amount: number; line_total: number;
  received_qty?: number;
  notes?: string | null;
}
export interface PurchaseOrder {
  id: number; company_id: number; code: string;
  partner_id: number; partner?: MiniPartner;
  warehouse_id?: number | null; warehouse?: MiniWarehouse;
  order_date: string; expected_date?: string | null;
  reference?: string | null;
  currency: string; exchange_rate: number;
  subtotal: number; tax_amount: number; discount: number; shipping: number; total: number;
  tax_type?: 'cgst_sgst' | 'igst' | 'none'; cgst_amount?: number; sgst_amount?: number; igst_amount?: number;
  received_amount: number;
  status: POStatus;
  notes?: string | null;
  lines?: POLine[];
  lines_count?: number;
}

export interface GrnLine {
  id?: number; purchase_order_item_id?: number | null;
  product_id: number; product?: MiniProduct;
  hsn_code?: string | null;
  qty: number; rate: number; line_total: number;
  batch_no?: string | null; expiry_date?: string | null;
  manufacturing_date?: string | null; serial_no?: string | null;
  ledger_id?: number | null; notes?: string | null;
}
export interface Grn {
  id: number; company_id: number; code: string;
  purchase_order_id?: number | null;
  partner_id: number; partner?: MiniPartner;
  warehouse_id: number; warehouse?: MiniWarehouse;
  grn_date: string;
  supplier_invoice_no?: string | null; supplier_invoice_date?: string | null;
  vehicle_no?: string | null; lr_no?: string | null;
  status: GrnStatus; notes?: string | null;
  lines?: GrnLine[]; lines_count?: number;
}

export interface PILine {
  id?: number; product_id: number; product?: MiniProduct;
  hsn_code?: string | null;
  qty: number; rate: number;
  discount_pct: number; tax_rate: number;
  line_subtotal: number; tax_amount: number; line_total: number;
  notes?: string | null;
}
export interface PurchaseInvoice {
  id: number; company_id: number; code: string;
  partner_id: number; partner?: MiniPartner;
  purchase_order_id?: number | null; grn_id?: number | null;
  supplier_invoice_no?: string | null;
  invoice_date: string; due_date?: string | null;
  currency: string; exchange_rate: number;
  subtotal: number; tax_amount: number; discount: number; shipping: number; total: number;
  tax_type?: 'cgst_sgst' | 'igst' | 'none'; cgst_amount?: number; sgst_amount?: number; igst_amount?: number;
  paid_amount: number; balance: number;
  status: PIStatus;
  posted_at?: string | null; notes?: string | null;
  lines?: PILine[]; lines_count?: number;
}
