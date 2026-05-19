import type { TransportMode, Incoterm } from './export.types';

export type PackingListStatus = 'draft' | 'finalized' | 'cancelled';

interface MiniPartner { id: number; code: string; name: string }
interface MiniProduct { id: number; code: string; name: string }

export interface PackingListLine {
  id?: number;
  export_invoice_item_id?: number | null;
  product_id: number;
  product?: MiniProduct;
  hsn_code?: string | null;
  qty: number;
  packages: number;
  shipper_unit?: string | null;
  marks?: string | null;
  gross_weight_kg: number;
  net_weight_kg: number;
  dimensions?: string | null;
  batch_no?: string | null;
  notes?: string | null;
}

export interface PackingList {
  id: number;
  company_id: number;
  code: string;
  export_invoice_id: number;
  export_invoice?: { id: number; code: string; currency?: string; total?: number };

  partner_id?: number | null;
  partner?: MiniPartner | null;

  pl_date?: string | null;
  invoice_date?: string | null;
  date_of_supply?: string | null;

  transport_mode?: TransportMode | null;
  incoterm?: Incoterm | null;
  lut_no?: string | null;
  lut_date?: string | null;
  tax_details?: string | null;
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

  marks_and_numbers?: string | null;
  total_packages: number;
  total_pallet_qty: number;
  gross_weight_kg: number;
  net_weight_kg: number;
  volume_cbm: number;

  status: PackingListStatus;
  finalized_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  notes?: string | null;
  lines?: PackingListLine[];
  lines_count?: number;
}
