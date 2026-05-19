export type IciStatus = 'draft' | 'posted' | 'cancelled';

interface MiniCompany { id: number; code: string; name: string }
interface MiniWarehouse { id: number; code: string; name: string }
interface MiniProduct { id: number; code: string; name: string }
interface LinkedDoc { id: number; code: string; status: string }

export interface IciLine {
  id?: number;
  product_id: number;
  product?: MiniProduct;
  hsn_code?: string | null;
  qty: number;
  cost_rate: number;
  sell_rate: number;
  tax_rate: number;
  line_subtotal: number;
  tax_amount: number;
  line_total: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  from_ledger_id?: number | null;
  to_ledger_id?: number | null;
  notes?: string | null;
}

export interface InterCompanyInvoice {
  id: number;
  code: string;
  from_company_id: number;
  from_company?: MiniCompany;
  to_company_id: number;
  to_company?: MiniCompany;
  from_warehouse_id: number;
  from_warehouse?: MiniWarehouse;
  to_warehouse_id: number;
  to_warehouse?: MiniWarehouse;
  invoice_date: string;
  due_date?: string | null;
  currency: string;
  exchange_rate: number;
  cost_basis: number;
  profit_pct: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: IciStatus;
  posted_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  linked_sale_invoice_id?: number | null;
  linked_sale_invoice?: LinkedDoc | null;
  linked_purchase_invoice_id?: number | null;
  linked_purchase_invoice?: LinkedDoc | null;
  lines?: IciLine[];
  lines_count?: number;
  notes?: string | null;
}
