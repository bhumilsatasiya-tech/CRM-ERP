import {
  BarChartOutlined, DatabaseOutlined, InboxOutlined, SwapOutlined,
  ToolOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function InventoryGateway() {
  return (
    <ModuleGateway
      title="Inventory & Stock"
      subtitle="Current stock by warehouse, adjustments, transfers, and the immutable stock ledger."
      sections={[
        {
          title: 'Stock',
          tiles: [
            { title: 'Current stock',     description: 'Live qty by product × warehouse',  icon: <DatabaseOutlined />,      route: '/stock/current',     color: '#1677ff' },
            { title: 'Stock ledger',      description: 'Append-only history of every movement', icon: <UnorderedListOutlined />, route: '/stock/ledger',  color: '#722ed1' },
            { title: 'Warehouses',        description: 'Manage warehouse master',          icon: <InboxOutlined />,         route: '/warehouses',        color: '#13c2c2' },
          ],
        },
        {
          title: 'Transactions',
          tiles: [
            { title: 'Stock adjustments', description: 'Physical-count / damage / expiry corrections', icon: <ToolOutlined />,   route: '/stock/adjustments', color: '#fa8c16' },
            { title: 'Stock transfers',   description: 'Move stock between warehouses',     icon: <SwapOutlined />,            route: '/stock/transfers',   color: '#52c41a' },
          ],
        },
        {
          title: 'Reports',
          tiles: [
            { title: 'Stock summary',     description: 'Quantity + valuation by product',  icon: <BarChartOutlined />, route: '/reports/view/stock-summary', color: '#9254de' },
          ],
        },
      ]}
    />
  );
}
