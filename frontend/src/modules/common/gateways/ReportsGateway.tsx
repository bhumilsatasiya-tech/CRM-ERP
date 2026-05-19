import {
  BankOutlined, BarChartOutlined, BookOutlined, DollarCircleOutlined, FundOutlined,
  GlobalOutlined, RiseOutlined, ShoppingCartOutlined, ShoppingOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function ReportsGateway() {
  return (
    <ModuleGateway
      title="Reports"
      subtitle="Statement Hub for per-party ledgers + nine financial / operational reports."
      sections={[
        {
          title: 'Statement Hub',
          tiles: [
            { title: 'Statement Hub', description: 'One place for every ledger — supplier, client, bank, loan, capital, P&L, BS', icon: <BookOutlined />, route: '/reports/statement', color: '#9254de' },
          ],
        },
        {
          title: 'Sales & purchase',
          tiles: [
            { title: 'Sales register',    description: 'All sales invoices for a period',     icon: <RiseOutlined />,        route: '/reports/view/sales-register',    color: '#1677ff' },
            { title: 'Purchase register', description: 'All purchase invoices for a period',  icon: <ShoppingCartOutlined />, route: '/reports/view/purchase-register', color: '#fa8c16' },
            { title: 'Payments receivable', description: 'AR aging — what buyers still owe',  icon: <DollarCircleOutlined />, route: '/reports/view/payments-receivable', color: '#13c2c2' },
            { title: 'Payments payable',  description: 'AP aging — what you still owe',       icon: <ShoppingOutlined />,    route: '/reports/view/payments-payable',  color: '#fa541c' },
          ],
        },
        {
          title: 'Financial statements',
          tiles: [
            { title: 'Profit & Loss',     description: 'Income vs expense for the period',    icon: <FundOutlined />,        route: '/reports/view/profit-and-loss',   color: '#722ed1' },
            { title: 'Balance Sheet',     description: 'Snapshot of assets / liab / equity',  icon: <BankOutlined />,        route: '/reports/view/balance-sheet',     color: '#9254de' },
          ],
        },
        {
          title: 'Operations',
          tiles: [
            { title: 'Stock summary',     description: 'Qty + valuation by product',          icon: <BarChartOutlined />,    route: '/reports/view/stock-summary',     color: '#52c41a' },
            { title: 'Production summary', description: 'Output + scrap + cost per batch',     icon: <ToolOutlined />,        route: '/reports/view/production-summary', color: '#eb2f96' },
            { title: 'Project Costing',   description: 'Manual cost study per finished product (RM + labour + conversion + overhead)', icon: <FundOutlined />, route: '/projects', color: '#9254de', badge: 'New' },
            { title: 'Export realization', description: 'EI + IRM combined realization view', icon: <GlobalOutlined />,      route: '/reports/view/export-realization', color: '#13c2c2' },
          ],
        },
      ]}
    />
  );
}
