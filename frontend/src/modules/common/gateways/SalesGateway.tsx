import {
  AppstoreOutlined, DollarCircleOutlined, FileTextOutlined, RiseOutlined,
  TeamOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function SalesGateway() {
  return (
    <ModuleGateway
      title="Sales"
      subtitle="Quotations, orders, invoices, and buyer receipts — everything that brings money in."
      sections={[
        {
          title: 'Transactions',
          tiles: [
            { title: 'Quotations',    description: 'Draft, send, convert to SO',           icon: <FileTextOutlined />,     route: '/quotations',     color: '#1677ff' },
            { title: 'Sales Orders',  description: 'Approve, track production progress',   icon: <UnorderedListOutlined />, route: '/sales-orders',  color: '#13c2c2' },
            { title: 'Invoices',      description: 'Post, record payment, cancel',          icon: <DollarCircleOutlined />, route: '/invoices',       color: '#fa8c16' },
          ],
        },
        {
          title: 'Quick actions',
          tiles: [
            { title: 'Buyer Receipt',     description: 'Lump-sum receipt → auto-applies oldest first', icon: <RiseOutlined />,        route: '/vouchers/buyer-receipt', color: '#2f54eb', shortcutId: 'voucher.receipt' },
            { title: 'New Quotation',     description: 'Start a fresh quote',                          icon: <FileTextOutlined />,     route: '/quotations/new',          color: '#1677ff' },
            { title: 'New Sales Order',   description: 'Create from approved quote or blank',          icon: <UnorderedListOutlined />, route: '/sales-orders/new',        color: '#13c2c2' },
            { title: 'New Invoice',       description: 'Post directly or from SO',                     icon: <DollarCircleOutlined />, route: '/invoices/new',            color: '#fa8c16' },
          ],
        },
        {
          title: 'Insight',
          tiles: [
            { title: 'Partner Statement', description: 'Per-buyer ledger with running balance',  icon: <TeamOutlined />,    route: '/partners?type=client', color: '#9254de' },
            { title: 'All ledgers',       description: 'Account, partner, bank, cash, loans',    icon: <AppstoreOutlined />, route: '/finance/ledgers',     color: '#722ed1' },
          ],
        },
      ]}
    />
  );
}
