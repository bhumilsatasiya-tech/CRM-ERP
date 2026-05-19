import type { TransportMode, Incoterm } from './export.types';

export type TaxInvoiceStatus = 'draft' | 'posted' | 'cancelled';
export type TaxInvoiceTaxType = 'cgst_sgst' | 'igst' | 'none';

interface MiniPartner { id: number; code: string; name: string }
interface MiniProduct { id: number; code: string; name: string }

export interface TaxInvoiceLine {
  id?: number;
  export_invoice_item_id?: number | null;
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
  batch_no?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}

export interface TaxInvoice {
  id: number;
  company_id: number;
  code: string;
  export_invoice_id: number;
  export_invoice?: { id: number; code: string; currency?: string };
  partner_id: number;
  partner?: MiniPartner;

  invoice_date: string;
  date_of_supply?: string | null;
  reference?: string | null;

  currency: string;
  exchange_rate: number;

  transport_mode?: TransportMode | null;
  incoterm?: Incoterm | null;
  lut_no?: string | null;
  lut_date?: string | null;
  tax_details?: string | null;

  customs_notification_no?: string | null;
  customs_notification_date?: string | null;
  gstin_supplier?: string | null;
  gstin_recipient?: string | null;
  place_of_supply?: string | null;

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
  payment_terms?: string | null;

  subtotal: number;
  tax_amount: number;
  tax_type: TaxInvoiceTaxType;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount: number;
  shipping: number;
  freight_charge: number;
  packaging_charge: number;
  development_charge: number;
  total: number;

  subtotal_inr: number;
  total_inr: number;

  status: TaxInvoiceStatus;
  posted_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  terms_and_conditions?: string | null;
  notes?: string | null;
  lines?: TaxInvoiceLine[];
  lines_count?: number;
}
