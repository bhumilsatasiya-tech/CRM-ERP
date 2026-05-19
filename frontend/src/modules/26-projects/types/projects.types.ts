export type ProjectStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export type CostCategory =
  | 'raw_material' | 'conversion' | 'packaging' | 'labour'
  | 'transport' | 'utilities' | 'overhead' | 'other';

export const COST_CATEGORIES: CostCategory[] = [
  'raw_material', 'conversion', 'packaging', 'labour',
  'transport', 'utilities', 'overhead', 'other',
];

export const CATEGORY_LABEL: Record<CostCategory, string> = {
  raw_material: 'Raw Material',
  conversion:   'Conversion',
  packaging:    'Packaging',
  labour:       'Labour',
  transport:    'Transport',
  utilities:    'Utilities',
  overhead:     'Overhead',
  other:        'Other',
};

export const CATEGORY_COLOR: Record<CostCategory, string> = {
  raw_material: '#1677ff',
  conversion:   '#722ed1',
  packaging:    '#13c2c2',
  labour:       '#fa8c16',
  transport:    '#52c41a',
  utilities:    '#eb2f96',
  overhead:     '#fa541c',
  other:        '#595959',
};

export interface ProjectCostEntry {
  id: number;
  project_id: number;
  category: CostCategory;
  description: string;
  qty: number;
  unit?: string | null;
  rate: number;
  amount: number;
  partner_id?: number | null;
  partner?: { id: number; code: string; name: string } | null;
  entry_date: string;
  is_planned: boolean;
  notes?: string | null;
}

export interface Project {
  id: number;
  company_id: number;
  code: string;
  name: string;
  description?: string | null;
  target_product_id?: number | null;
  target_product?: { id: number; code: string; name: string } | null;
  target_qty: number;
  unit?: string | null;
  status: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  planned_total: number;
  actual_total: number;
  notes?: string | null;
  entries_count?: number;
  entries?: ProjectCostEntry[];
}

export interface ProjectSummary {
  by_category: Array<{
    category: CostCategory;
    planned: number;
    actual: number;
    variance: number;
    variance_pct: number | null;
  }>;
  planned_total: number;
  actual_total: number;
  variance: number;
  variance_pct: number | null;
  cost_per_unit_actual: number | null;
}

export interface CreateProjectPayload {
  code?: string;
  name: string;
  description?: string;
  target_product_id?: number | null;
  target_qty?: number;
  unit?: string;
  status?: ProjectStatus;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface CostEntryPayload {
  category: CostCategory;
  description: string;
  qty?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  partner_id?: number | null;
  entry_date?: string;
  is_planned?: boolean;
  notes?: string;
}
