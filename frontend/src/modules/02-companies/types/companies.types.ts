export type CompanyType = 'export' | 'supplying' | 'trading' | 'other';

export interface Address {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
}

export interface Company {
  id: number;
  code: string;
  name: string;
  legal_name?: string | null;
  type: CompanyType;
  gst_no?: string | null;
  pan_no?: string | null;
  cin_no?: string | null;
  iec_no?: string | null;
  tan_no?: string | null;
  registration_no?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: Address;
  bill_to?: Address;
  ship_to?: Address;
  currency?: string | null;
  fiscal_year_start?: string | null;
  logo_path?: string | null;
  is_active: boolean;
  meta?: Record<string, unknown> | null;
  branches_count?: number;
  warehouses_count?: number;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Branch {
  id: number;
  company_id: number;
  code: string;
  name: string;
  is_head_office: boolean;
  email?: string | null;
  phone?: string | null;
  address?: Address;
  gst_no?: string | null;
  is_active: boolean;
  warehouses_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type WarehouseType = 'finished' | 'raw' | 'packaging' | 'quarantine' | 'transit' | 'reject' | 'other';

export interface Warehouse {
  id: number;
  company_id: number;
  branch_id?: number | null;
  code: string;
  name: string;
  type: WarehouseType;
  address?: Address;
  is_active: boolean;
  is_default: boolean;
  branch?: { id: number; code: string; name: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCompanyPayload {
  code: string;
  name: string;
  legal_name?: string;
  type: CompanyType;
  gst_no?: string;
  pan_no?: string;
  cin_no?: string;
  iec_no?: string;
  tan_no?: string;
  registration_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  bill_to_line1?: string;
  bill_to_line2?: string;
  bill_to_city?: string;
  bill_to_state?: string;
  bill_to_country?: string;
  bill_to_postal_code?: string;
  ship_to_line1?: string;
  ship_to_line2?: string;
  ship_to_city?: string;
  ship_to_state?: string;
  ship_to_country?: string;
  ship_to_postal_code?: string;
  currency?: string;
  fiscal_year_start?: string;
  is_active?: boolean;
}
export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

export interface CreateBranchPayload {
  code: string;
  name: string;
  is_head_office?: boolean;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  gst_no?: string;
  is_active?: boolean;
}
export type UpdateBranchPayload = Partial<CreateBranchPayload>;

export interface CreateWarehousePayload {
  code: string;
  name: string;
  type: WarehouseType;
  branch_id?: number | null;
  address_line1?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_active?: boolean;
  is_default?: boolean;
}
export type UpdateWarehousePayload = Partial<CreateWarehousePayload>;
