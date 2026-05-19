export type ExportInvoiceStatus = 'draft' | 'posted' | 'partially_paid' | 'paid' | 'cancelled';
export type ShippingBillStatus = 'draft' | 'dispatched' | 'cancelled';
export type Incoterm = 'FOB' | 'CIF' | 'EXW' | 'CFR' | 'DAP' | 'DDP';
export type TransportMode = 'air' | 'sea' | 'road' | 'rail' | 'multimodal' | 'other';

interface MiniPartner { id: number; code: string; name: string }
interface MiniWarehouse { id: number; code: string; name: string }
interface MiniProduct { id: number; code: string; name: string }

export interface ExportInvoiceLine {
  id?: number;
  sales_order_item_id?: number | null;
  product_id: number;
  product?: MiniProduct;
  hsn_code?: string | null;
  qty: number;
  shipper_qty?: number | null;
  shipper_unit?: string | null;
  rate: number;
  discount_pct: number;
  tax_rate: number;
  line_subtotal: number;
  tax_amount: number;
  line_total: number;
  shipped_qty?: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}

export interface ExportInvoice {
  id: number;
  company_id: number;
  code: string;
  partner_id: number;
  partner?: MiniPartner;
  sales_order_id?: number | null;

  invoice_date: string;
  date_of_supply?: string | null;
  due_date?: string | null;
  reference?: string | null;

  currency: string;
  exchange_rate: number;
  tax_type?: 'cgst_sgst' | 'igst' | 'none';
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;

  incoterm: Incoterm;
  transport_mode?: TransportMode | null;
  lut_no?: string | null;
  lut_date?: string | null;
  tax_details?: string | null;

  consignee_partner_id?: number | null;
  consignee?: MiniPartner | null;
  consignee_name?: string | null;
  consignee_address?: string | null;
  consignee_country?: string | null;
  consignee_contact_person?: string | null;
  consignee_phone?: string | null;
  consignee_email?: string | null;
  consignee_registration_no?: string | null;

  notify_party_name?: string | null;
  notify_party_address?: string | null;

  port_of_loading?: string | null;
  port_of_discharge?: string | null;
  loading_destination?: string | null;
  final_destination?: string | null;
  country_of_destination?: string | null;
  payment_terms?: string | null;

  subtotal: number;
  tax_amount: number;
  discount: number;
  shipping: number;
  freight_charge: number;
  packaging_charge: number;
  development_charge: number;
  total: number;
  paid_amount: number;
  balance: number;

  status: ExportInvoiceStatus;
  posted_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  terms_and_conditions?: string | null;
  notes?: string | null;
  lines?: ExportInvoiceLine[];
  shipping_bills?: Array<{ id: number; code: string; status: ShippingBillStatus; bl_no?: string | null; bl_date?: string | null; dispatched_at?: string | null }>;
  packing_lists?: Array<{ id: number; code: string; status: 'draft' | 'finalized' | 'cancelled'; pl_date?: string | null }>;
  tax_invoices?: Array<{ id: number; code: string; status: 'draft' | 'posted' | 'cancelled'; invoice_date?: string | null; total_inr: number }>;
  lines_count?: number;
  shipping_bills_count?: number;
}

export interface ShippingBillLine {
  id?: number;
  export_invoice_item_id?: number | null;
  product_id: number;
  product?: MiniProduct;
  hsn_code?: string | null;
  qty: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  ledger_id?: number | null;
  notes?: string | null;
}

export interface ShippingBill {
  id: number;
  company_id: number;
  code: string;
  export_invoice_id: number;
  export_invoice?: { id: number; code: string };
  warehouse_id: number;
  warehouse?: MiniWarehouse;
  bl_no?: string | null;
  bl_date?: string | null;
  vessel_name?: string | null;
  voyage_no?: string | null;
  carrier?: string | null;
  container_no?: string | null;
  port_of_loading?: string | null;
  port_of_discharge?: string | null;
  etd?: string | null;
  eta?: string | null;
  status: ShippingBillStatus;
  dispatched_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  notes?: string | null;
  lines?: ShippingBillLine[];
  lines_count?: number;
}
