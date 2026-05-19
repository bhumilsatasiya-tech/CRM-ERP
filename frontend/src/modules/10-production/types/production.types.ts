export type ProductionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type OutputType = 'finished' | 'by_product' | 'scrap';
export type QcResult = 'pass' | 'fail';

interface MiniProduct { id: number; code: string; name: string }
interface MiniWarehouse { id: number; code: string; name: string }
interface MiniSalesOrder { id: number; code: string }

export interface ProductionInput {
  id?: number;
  product_id: number;
  product?: MiniProduct;
  qty_planned: number;
  qty_consumed: number;
  rate: number;
  line_value: number;
  source_batch_no?: string | null;
  ledger_id?: number | null;
  notes?: string | null;
}

export interface ProductionOutput {
  id?: number;
  product_id: number;
  product?: MiniProduct;
  output_type: OutputType;
  qty_planned: number;
  qty_produced: number;
  rate: number;
  line_value: number;
  output_batch_no?: string | null;
  expiry_date?: string | null;
  ledger_id?: number | null;
  notes?: string | null;
}

export interface QualityCheck {
  id: number;
  batch_id: number;
  checked_by?: number | null;
  checked_at: string;
  result: QcResult;
  parameter?: string | null;
  expected?: string | null;
  observed?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface ProductionBatch {
  id: number;
  company_id: number;
  code: string;

  target_product_id: number;
  target_product?: MiniProduct;

  qty_planned: number;
  qty_produced: number;
  qty_failed: number;

  raw_warehouse_id: number;
  raw_warehouse?: MiniWarehouse;
  finished_warehouse_id: number;
  finished_warehouse?: MiniWarehouse;

  sales_order_id?: number | null;
  sales_order?: MiniSalesOrder | null;

  planned_start_date: string;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;

  output_batch_no?: string | null;
  output_expiry_date?: string | null;

  material_cost: number;

  status: ProductionStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;

  notes?: string | null;

  inputs?: ProductionInput[];
  outputs?: ProductionOutput[];
  quality_checks?: QualityCheck[];
  inputs_count?: number;
  outputs_count?: number;
}
