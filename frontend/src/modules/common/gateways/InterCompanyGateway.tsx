import { ApartmentOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function InterCompanyGateway() {
  return (
    <ModuleGateway
      title="Inter-Company"
      subtitle="One ICI = stock OUT in seller + IN in buyer + Sale invoice + Purchase invoice, all in one click."
      sections={[
        {
          title: 'Inter-company invoices',
          tiles: [
            { title: 'All ICIs',          description: 'Browse + filter every ICI',                icon: <SwapOutlined />,        route: '/inter-company-invoices',    color: '#1677ff' },
            { title: 'New ICI',           description: 'Create + post in one transaction',         icon: <PlusOutlined />,        route: '/inter-company-invoices/new', color: '#722ed1' },
          ],
        },
        {
          title: 'Companion docs',
          tiles: [
            { title: 'Linked invoices',   description: 'Sale-side invoices created by ICI',        icon: <ApartmentOutlined />,   route: '/invoices',     color: '#13c2c2' },
            { title: 'Linked purchase invoices', description: 'Buy-side PIs created by ICI',       icon: <ApartmentOutlined />,   route: '/purchase-invoices', color: '#fa8c16' },
          ],
        },
      ]}
    />
  );
}
