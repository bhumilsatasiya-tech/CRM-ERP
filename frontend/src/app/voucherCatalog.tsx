import {
  DollarCircleOutlined, ExperimentOutlined, FileDoneOutlined, FileTextOutlined,
  GlobalOutlined, InboxOutlined, RetweetOutlined, RiseOutlined,
  ShoppingCartOutlined, ShoppingOutlined, SwapOutlined, TruckOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface VoucherEntry {
  /** Short label shown in the rail. Keep ≤ 16 chars so it fits. */
  label: string;
  /** Icon node. */
  icon: ReactNode;
  /** Where clicking goes — "Create new" route. */
  newRoute: string;
  /** Route used to detect "this voucher type is currently active". */
  activeMatch: string;
  /** Brand color for icon. */
  color: string;
}

export interface VoucherGroup {
  title: string;
  items: VoucherEntry[];
}

/**
 * Catalog used by the right-side `VoucherSwitcher` rail (Tally-style) and by
 * `useVoucherPath` to detect when the rail should appear.
 *
 * Entries are grouped so the rail is scannable; the order is by everyday flow:
 * Sales → Purchase → Export → Other.
 */
export const VOUCHER_CATALOG: VoucherGroup[] = [
  {
    title: 'Sales',
    items: [
      { label: 'Quotation',     icon: <FileTextOutlined />,     newRoute: '/quotations/new',    activeMatch: '/quotations',    color: '#1677ff' },
      { label: 'Sales Order',   icon: <FileDoneOutlined />,     newRoute: '/sales-orders/new',  activeMatch: '/sales-orders',  color: '#13c2c2' },
      { label: 'Invoice',       icon: <DollarCircleOutlined />, newRoute: '/invoices/new',      activeMatch: '/invoices',      color: '#fa8c16' },
      { label: 'Buyer Receipt', icon: <RiseOutlined />,         newRoute: '/vouchers/buyer-receipt', activeMatch: '/vouchers/buyer-receipt', color: '#2f54eb' },
    ],
  },
  {
    title: 'Purchase',
    items: [
      { label: 'Purchase Order',   icon: <ShoppingCartOutlined />, newRoute: '/purchase-orders/new',   activeMatch: '/purchase-orders',   color: '#1677ff' },
      { label: 'GRN',              icon: <InboxOutlined />,        newRoute: '/grns/new',              activeMatch: '/grns',              color: '#13c2c2' },
      { label: 'Purchase Invoice', icon: <FileTextOutlined />,     newRoute: '/purchase-invoices/new', activeMatch: '/purchase-invoices', color: '#fa8c16' },
      { label: 'Supplier Payment', icon: <ShoppingOutlined />,     newRoute: '/vouchers/supplier-payment', activeMatch: '/vouchers/supplier-payment', color: '#fa541c' },
    ],
  },
  {
    title: 'Export',
    items: [
      { label: 'Export Invoice', icon: <GlobalOutlined />,   newRoute: '/export-invoices/new', activeMatch: '/export-invoices', color: '#1677ff' },
      { label: 'Shipping Bill',  icon: <TruckOutlined />,    newRoute: '/shipping-bills/new',  activeMatch: '/shipping-bills',  color: '#13c2c2' },
      { label: 'Packing List',   icon: <InboxOutlined />,    newRoute: '/packing-lists/new',   activeMatch: '/packing-lists',   color: '#52c41a' },
      { label: 'Tax Invoice',    icon: <FileTextOutlined />, newRoute: '/tax-invoices/new',    activeMatch: '/tax-invoices',    color: '#fa8c16' },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Inter-Co Invoice', icon: <SwapOutlined />,       newRoute: '/inter-company-invoices/new', activeMatch: '/inter-company-invoices', color: '#722ed1' },
      { label: 'Batch',            icon: <ExperimentOutlined />, newRoute: '/production-batches/new',    activeMatch: '/production-batches',     color: '#9254de' },
      { label: 'Journal',          icon: <FileTextOutlined />,   newRoute: '/journal-entries/new',       activeMatch: '/journal-entries',        color: '#595959' },
      { label: 'Stock Adj',        icon: <SwapOutlined />,       newRoute: '/stock/adjustments/new',     activeMatch: '/stock/adjustments',      color: '#fa8c16' },
      { label: 'Stock Transfer',   icon: <RetweetOutlined />,    newRoute: '/stock/transfers/new',       activeMatch: '/stock/transfers',        color: '#52c41a' },
    ],
  },
];

/** Flat list of every activeMatch — used by `useVoucherPath` to decide visibility. */
export const VOUCHER_ACTIVE_PATHS: string[] = VOUCHER_CATALOG.flatMap((g) => g.items.map((i) => i.activeMatch));
