export type TimelineKind =
  | 'quotation_created'
  | 'quotation_approved'
  | 'so_created'
  | 'so_approved'
  | 'batch_started'
  | 'batch_completed'
  | 'batch_cancelled'
  | 'invoice_created'
  | 'invoice_posted'
  | 'invoice_cancelled'
  | 'payment_received';

export interface TimelineEvent {
  kind: TimelineKind;
  at: string | null;
  ref_type: string;
  ref_id: number;
  ref_code: string;
  label: string;
  amount?: number | null;
}

export interface TrackingProgress {
  ordered_qty: number;
  produced_qty: number;
  invoiced_amount: number;
  paid_amount: number;
  total?: number;
  produced_pct: number;
  invoiced_pct: number;
  paid_pct: number;
}

export interface TrackingDashboardRow {
  id: number;
  code: string;
  status: string;
  order_date: string;
  expected_delivery_date?: string | null;
  partner?: { id: number; code: string; name: string } | null;
  currency: string;
  total: number;
  invoiced_amount: number;
  lines_count?: number;
  invoices_count?: number;
  batches_count?: number;
  progress: TrackingProgress;
}

interface MiniProduct { id: number; code: string; name: string }
interface MiniWarehouse { id: number; code: string; name: string }

export interface TrackingTimeline {
  sales_order: {
    id: number; code: string; status: string;
    order_date: string; expected_delivery_date?: string | null;
    partner?: { id: number; code: string; name: string } | null;
    warehouse?: MiniWarehouse | null;
    currency: string;
    total: number; invoiced_amount: number;
    lines: Array<{
      id: number;
      product?: MiniProduct | null;
      qty: number; invoiced_qty: number; rate: number; line_total: number;
    }>;
  };
  quotation: { id: number; code: string; status: string; quotation_date?: string; total: number } | null;
  production: {
    batches: Array<{
      id: number; code: string; status: string;
      target_product?: MiniProduct | null;
      qty_planned: number; qty_produced: number; qty_failed: number;
      planned_start_date?: string;
      completed_at?: string | null; cancelled_at?: string | null;
    }>;
    total_planned: number;
    total_produced: number;
    total_failed: number;
  };
  invoices: Array<{
    id: number; code: string; status: string;
    invoice_date: string; total: number; paid_amount: number; balance: number;
    posted_at?: string | null; payments_count: number;
  }>;
  payments_total: number;
  stock_movements: Array<{
    ledger_id: number;
    product?: MiniProduct | null;
    warehouse?: MiniWarehouse | null;
    movement_type: string;
    qty: number; rate: number; value: number;
    batch_no?: string | null;
    expiry_date?: string | null;
    posted_at?: string | null;
    reference_no?: string | null;
    reference_type?: string | null;
    reference_id?: number | null;
    is_reversal: boolean;
  }>;
  progress: TrackingProgress;
  timeline: TimelineEvent[];
}
