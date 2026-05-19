export type FormulaStatus = 'draft' | 'active' | 'inactive';

interface MiniProduct { id: number; code: string; name: string }
interface MiniUom { id: number; code: string; symbol?: string }

export interface FormulaComponent {
  id?: number;
  product_id: number;
  product?: MiniProduct;
  uom_id?: number | null;
  qty: number;
  wastage_pct: number;
  notes?: string | null;
}

export interface Formula {
  id: number;
  company_id: number;
  code: string;
  version: number;
  is_active: boolean;
  status: FormulaStatus;
  target_product_id: number;
  target_product?: MiniProduct;
  output_qty: number;
  output_uom_id?: number | null;
  output_uom?: MiniUom | null;
  components?: FormulaComponent[];
  components_count?: number;
  notes?: string | null;
}

export interface ScaledInput {
  product_id: number;
  product_code?: string;
  product_name?: string;
  qty_planned: number;
  rate: number;
  line_value: number;
  source_batch_no?: string | null;
  notes?: string | null;
}

export interface ScaleResponse {
  inputs: ScaledInput[];
  formula: Formula | null;
  message?: string;
}
