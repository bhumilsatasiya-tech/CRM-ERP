export type PartnerType = 'client' | 'supplier' | 'vendor' | 'manufacturer' | 'importer' | 'employee' | 'logistic' | 'other';
export type TaxTreatment = 'registered' | 'unregistered' | 'composition' | 'sez' | 'overseas';
export type Segment = 'b2b' | 'b2c' | 'distributor' | 'oem' | 'other';
export type AddressType = 'billing' | 'shipping' | 'registered' | 'branch';

export interface PartnerContact {
  id: number;
  partner_id: number;
  name: string;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerAddress {
  id: number;
  partner_id: number;
  type: AddressType;
  label?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  gst_no_at_address?: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerBankAccount {
  id: number;
  partner_id: number;
  bank_name: string;
  branch?: string | null;
  account_holder: string;
  account_no: string;
  account_no_masked?: string;
  account_type?: string | null;
  ifsc?: string | null;
  swift?: string | null;
  iban?: string | null;
  currency: string;
  bank_country?: string | null;
  bank_address?: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Partner {
  id: number;
  company_id: number;
  code: string;
  name: string;
  legal_name?: string | null;
  is_company: boolean;
  type: PartnerType;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  country: string;
  gst_no?: string | null;
  pan_no?: string | null;
  vat_no?: string | null;
  cin_no?: string | null;
  tax_treatment: TaxTreatment;
  industry?: string | null;
  segment: Segment;
  currency: string;
  credit_limit: number;
  credit_days: number;
  opening_balance: number;
  opening_balance_type: 'debit' | 'credit';
  default_payment_terms_days: number;
  default_warehouse_id?: number | null;
  default_billing_address_id?: number | null;
  default_shipping_address_id?: number | null;
  default_bank_account_id?: number | null;
  is_active: boolean;
  is_blacklisted: boolean;
  blacklist_reason?: string | null;
  notes?: string | null;
  meta?: Record<string, unknown> | null;

  contacts_count?: number;
  addresses_count?: number;
  bank_accounts_count?: number;

  contacts?: PartnerContact[];
  addresses?: PartnerAddress[];
  bank_accounts?: PartnerBankAccount[];

  created_at?: string;
  updated_at?: string;
}

export interface CreatePartnerPayload {
  code?: string;
  name: string;
  legal_name?: string;
  is_company?: boolean;
  type: PartnerType;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  country?: string;
  gst_no?: string;
  pan_no?: string;
  vat_no?: string;
  cin_no?: string;
  tax_treatment?: TaxTreatment;
  industry?: string;
  segment?: Segment;
  currency?: string;
  credit_limit?: number;
  credit_days?: number;
  opening_balance?: number;
  opening_balance_type?: 'debit' | 'credit';
  default_payment_terms_days?: number;
  default_warehouse_id?: number | null;
  is_active?: boolean;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  notes?: string;
}
export type UpdatePartnerPayload = Partial<CreatePartnerPayload>;

export type CreatePartnerContactPayload = Omit<PartnerContact, 'id' | 'partner_id' | 'created_at' | 'updated_at'>;
export type CreatePartnerAddressPayload = Omit<PartnerAddress, 'id' | 'partner_id' | 'created_at' | 'updated_at'>;
export type CreatePartnerBankPayload = Omit<PartnerBankAccount, 'id' | 'partner_id' | 'account_no_masked' | 'created_at' | 'updated_at'>;
