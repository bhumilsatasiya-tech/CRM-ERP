import {
  AppstoreOutlined, FileTextOutlined, InboxOutlined, ShoppingCartOutlined,
  ShoppingOutlined, TeamOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function PurchaseGateway() {
  return (
    <ModuleGateway
      title="Purchase"
      subtitle="Purchase orders, goods receipt, purchase invoices, and supplier payments."
      sections={[
        {
          title: 'Transactions',
          tiles: [
            { title: 'Purchase Orders',   description: 'Approve, track receipt progress',     icon: <ShoppingCartOutlined />, route: '/purchase-orders',   color: '#1677ff' },
            { title: 'GRN (Goods Receipt)', description: 'Receive stock, write to ledger',     icon: <InboxOutlined />,        route: '/grns',              color: '#13c2c2' },
            { title: 'Purchase Invoices', description: 'Post AP, record supplier payment',     icon: <FileTextOutlined />,     route: '/purchase-invoices', color: '#fa8c16' },
          ],
        },
        {
          title: 'Quick actions',
          tiles: [
            { title: 'Supplier Payment', description: 'Lump-sum pay → auto-applies oldest first', icon: <ShoppingOutlined />,    route: '/vouchers/supplier-payment', color: '#fa541c', shortcutId: 'voucher.supplier-payment' },
            { title: 'New Purchase Order', description: 'Place a fresh PO',                       icon: <ShoppingCartOutlined />, route: '/purchase-orders/new',        color: '#1677ff' },
            { title: 'New GRN',          description: 'Receive against an open PO',              icon: <InboxOutlined />,        route: '/grns/new',                   color: '#13c2c2' },
            { title: 'New Purchase Invoice', description: 'Record supplier bill',                icon: <FileTextOutlined />,     route: '/purchase-invoices/new',      color: '#fa8c16' },
          ],
        },
        {
          title: 'Insight',
          tiles: [
            { title: 'Supplier Statement', description: 'Per-supplier ledger with running balance', icon: <TeamOutlined />,    route: '/partners?type=supplier', color: '#9254de' },
            { title: 'All ledgers',        description: 'Account, partner, bank, cash, loans',     icon: <AppstoreOutlined />, route: '/finance/ledgers',       color: '#722ed1' },
          ],
        },
      ]}
    />
  );
}
