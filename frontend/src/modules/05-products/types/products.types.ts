export type ProductType = 'raw' | 'finished' | 'packaging' | 'consumable' | 'service' | 'other';
export type UnitType = 'weight' | 'volume' | 'count' | 'length' | 'area' | 'time' | 'other';

export interface ProductUnit {
  id: number;
  company_id: number;
  code: string;
  name: string;
  formal_name?: string | null;
  symbol: string;
  uqc?: string | null;
  type: UnitType;
  base_unit_id?: number | null;
  conversion_factor: number;
  is_base: boolean;
  decimals_allowed: number;
  is_active: boolean;
}

export interface ProductCategory {
  id: number;
  company_id: number;
  parent_id?: number | null;
  code: string;
  name: string;
  description?: string | null;
  depth: number;
  path?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductUomConversion {
  id: number;
  product_id: number;
  unit_id: number;
  unit?: { id: number; code: string; symbol: string };
  conversion_factor: number;
  is_purchase_default: boolean;
  is_sales_default: boolean;
  notes?: string | null;
  is_active: boolean;
}

export interface Product {
  id: number;
  company_id: number;
  code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category_id?: number | null;
  category?: { id: number; code: string; name: string } | null;
  type: ProductType;
  is_company_made: boolean;
  unit_id: number;
  unit?: { id: number; code: string; symbol: string };
  hsn_code?: string | null;
  tax_rate: number;
  standard_cost: number;
  last_purchase_cost: number;
  opening_stock_qty: number;
  opening_stock_value: number;
  standard_price: number;
  mrp: number;
  currency: string;
  reorder_level: number;
  reorder_qty: number;
  min_stock: number;
  max_stock: number;
  lead_time_days: number;
  shelf_life_days?: number | null;
  has_batches: boolean;
  has_expiry: boolean;
  has_serials: boolean;
  default_warehouse_id?: number | null;
  is_active: boolean;
  is_purchasable: boolean;
  is_sellable: boolean;
  is_stockable: boolean;
  weight?: number | null;
  weight_unit_id?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  image_path?: string | null;
  meta?: Record<string, unknown> | null;
  notes?: string | null;
  uom_conversions?: ProductUomConversion[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductPayload {
  code?: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: number | null;
  type: ProductType;
  is_company_made?: boolean;
  unit_id: number;
  hsn_code?: string;
  tax_rate?: number;
  standard_cost?: number;
  last_purchase_cost?: number;
  opening_stock_qty?: number;
  opening_stock_value?: number;
  standard_price?: number;
  mrp?: number;
  currency?: string;
  reorder_level?: number;
  reorder_qty?: number;
  min_stock?: number;
  max_stock?: number;
  lead_time_days?: number;
  shelf_life_days?: number | null;
  has_batches?: boolean;
  has_expiry?: boolean;
  has_serials?: boolean;
  default_warehouse_id?: number | null;
  is_active?: boolean;
  is_purchasable?: boolean;
  is_sellable?: boolean;
  is_stockable?: boolean;
  weight?: number;
  weight_unit_id?: number | null;
  length?: number;
  width?: number;
  height?: number;
  notes?: string;
}
export type UpdateProductPayload = Partial<CreateProductPayload>;

export type CreateCategoryPayload = Omit<ProductCategory, 'id' | 'company_id' | 'depth' | 'path' | 'code'> & { code?: string; sort_order?: number };
export type CreateUnitPayload = Omit<ProductUnit, 'id' | 'company_id' | 'code'> & { code?: string };
export type CreateUomConversionPayload = Omit<ProductUomConversion, 'id' | 'product_id' | 'unit'>;
