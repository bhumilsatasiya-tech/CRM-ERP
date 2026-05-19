import {
  BankOutlined, BookOutlined, DollarCircleOutlined, FileTextOutlined,
  GoldOutlined, PercentageOutlined, RiseOutlined, ShoppingOutlined,
  SolutionOutlined, SwapOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function FinanceGateway() {
  return (
    <ModuleGateway
      title="Finance"
      subtitle="Books, ledgers, vouchers — one place for every accounting entry."
      sections={[
        {
          title: 'Books & ledgers',
          tiles: [
            { title: 'Books & Ledgers',   description: 'Account, partner, bank, cash, loan, capital',  icon: <BookOutlined />,        route: '/finance/ledgers',      color: '#9254de' },
            { title: 'Chart of accounts', description: 'Master list of accounts',                       icon: <BookOutlined />,        route: '/accounts',             color: '#722ed1' },
            { title: 'Journal entries',   description: 'Manual double-entry journals',                  icon: <FileTextOutlined />,    route: '/journal-entries',      color: '#1677ff' },
            { title: 'Trial balance',     description: 'Snapshot of all account balances',              icon: <PercentageOutlined />,  route: '/finance/trial-balance', color: '#13c2c2' },
          ],
        },
        {
          title: 'Quick vouchers',
          tiles: [
            { title: 'Buyer Receipt',     description: 'Money received from a buyer',                 icon: <RiseOutlined />,        route: '/vouchers/buyer-receipt',    color: '#2f54eb', shortcutId: 'voucher.receipt' },
            { title: 'Supplier Payment',  description: 'Money paid to a supplier',                    icon: <ShoppingOutlined />,    route: '/vouchers/supplier-payment', color: '#fa541c', shortcutId: 'voucher.supplier-payment' },
            { title: 'Bank Receipt',      description: 'Capital / loan / refund / interest in',       icon: <BankOutlined />,        onClick: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'bank-receipt' })), color: '#13c2c2', shortcutId: 'voucher.bank-receipt' },
            { title: 'Expense',           description: 'Office, utilities, bank charges, etc.',       icon: <DollarCircleOutlined />, onClick: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'expense' })), color: '#fa8c16', shortcutId: 'voucher.expense' },
            { title: 'Contra',            description: 'Bank ↔ Cash / Bank ↔ Bank transfers',         icon: <SwapOutlined />,        onClick: () => window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: 'contra' })), color: '#52c41a', shortcutId: 'voucher.contra' },
          ],
        },
        {
          title: 'Other',
          tiles: [
            { title: 'Loans',           description: 'EMI schedules, payments, outstanding',  icon: <GoldOutlined />,    route: '/loans',                color: '#fa8c16' },
            { title: 'Capital ledger',  description: 'Proprietor draws + contributions',       icon: <SolutionOutlined />, route: '/finance/ledgers',     color: '#eb2f96' },
          ],
        },
      ]}
    />
  );
}
