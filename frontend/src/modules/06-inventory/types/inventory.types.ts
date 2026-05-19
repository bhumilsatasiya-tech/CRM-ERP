export type MovementType = 'opening' | 'in' | 'out' | 'transfer_in' | 'transfer_out' | 'adjustment';
export type AdjustmentStatus = 'draft' | 'submitted' | 'approved' | 'cancelled';
export type TransferStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface StockLedgerRow {
  id: number;
  company_id: number;
  warehouse_id: number;
  warehouse?: { id: number; code: string; name: string };
  product_id: number;
  product?: { id: number; code: string; name: string; unit?: string };
  movement_type: MovementType;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_no?: string | null;
  batch_no?: string | null;
  expiry_date?: string | null;
  serial_no?: string | null;
  qty: number;
  balance_qty: number;
  rate: number;
  value: number;
  posted_at?: string;
  is_reversal: boolean;
  is_reversed: boolean;
  reverses_ledger_id?: number | null;
  reversed_by_ledger_id?: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface CurrentStockRow {
  product_id: number;
  product_code: string;
  product_name: string;
  unit?: string;
  warehouse_id: number;
  warehouse_code: string;
  warehouse_name: string;
  qty: number;
  value: number;
  batches: Array<{ batch_no?: string | null; expiry_date?: string | null; qty: number }>;
  reorder_level?: number;
}

export interface StockAdjustmentLine {
  id?: number;
  product_id: number;
  product?: { id: number; code: string; name: string };
  current_qty: number;
  counted_qty: number;
  difference: number;
  rate: number;
  value: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  serial_no?: string | null;
  ledger_id?: number | null;
  notes?: string | null;
}

export interface StockAdjustment {
  id: number;
  company_id: number;
  warehouse_id: number;
  warehouse?: { id: number; code: string; name: string };
  code: string;
  adjustment_date: string;
  reason: string;
  status: AdjustmentStatus;
  notes?: string | null;
  submitted_by?: number | null;
  submitted_at?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  cancelled_by?: number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  lines?: StockAdjustmentLine[];
  lines_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateStockAdjustmentPayload {
  warehouse_id: number;
  adjustment_date?: string;
  reason?: string;
  notes?: string;
  lines: Array<{
    product_id: number;
    current_qty?: number;
    counted_qty: number;
    rate?: number;
    batch_no?: string;
    expiry_date?: string;
    serial_no?: string;
    notes?: string;
  }>;
}

export interface StockTransferLine {
  id?: number;
  product_id: number;
  product?: { id: number; code: string; name: string };
  qty: number;
  rate: number;
  value: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  serial_no?: string | null;
  out_ledger_id?: number | null;
  in_ledger_id?: number | null;
  notes?: string | null;
}

export interface StockTransfer {
  id: number;
  company_id: number;
  code: string;
  from_warehouse_id: number;
  from_warehouse?: { id: number; code: string; name: string };
  to_warehouse_id: number;
  to_warehouse?: { id: number; code: string; name: string };
  transfer_date: string;
  expected_arrival_date?: string | null;
  actual_arrival_date?: string | null;
  status: TransferStatus;
  notes?: string | null;
  sent_by?: number | null;
  sent_at?: string | null;
  received_by?: number | null;
  received_at?: string | null;
  cancelled_by?: number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  lines?: StockTransferLine[];
  lines_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateStockTransferPayload {
  from_warehouse_id: number;
  to_warehouse_id: number;
  transfer_date?: string;
  expected_arrival_date?: string;
  notes?: string;
  lines: Array<{
    product_id: number;
    qty: number;
    rate?: number;
    batch_no?: string;
    expiry_date?: string;
    serial_no?: string;
    notes?: string;
  }>;
}
