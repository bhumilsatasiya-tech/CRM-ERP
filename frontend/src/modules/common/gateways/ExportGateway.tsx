import {
  BankOutlined, FileTextOutlined, GiftOutlined, GlobalOutlined,
  InboxOutlined, RocketOutlined, ScheduleOutlined, TruckOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function ExportGateway() {
  return (
    <ModuleGateway
      title="Export & Bank"
      subtitle="Export invoices, shipping bills, packing lists, tax invoices, IRMs, lodgement, and export incentives."
      sections={[
        {
          title: 'Documents',
          tiles: [
            { title: 'Export invoices',   description: 'FCY billing + companion docs auto-spawn', icon: <GlobalOutlined />,    route: '/export-invoices', color: '#1677ff' },
            { title: 'Shipping bills',    description: 'Dispatch → stock OUT on goods leaving',   icon: <TruckOutlined />,     route: '/shipping-bills',  color: '#13c2c2' },
            { title: 'Packing lists',     description: 'For customs — package + weight detail',   icon: <InboxOutlined />,     route: '/packing-lists',   color: '#52c41a' },
            { title: 'Tax invoices',      description: 'GST INR view of the export invoice',      icon: <FileTextOutlined />,  route: '/tax-invoices',    color: '#fa8c16' },
          ],
        },
        {
          title: 'Bank / remittance',
          tiles: [
            { title: 'IRMs (remittances)', description: 'FCY receipts from overseas buyers',     icon: <BankOutlined />,      route: '/irms',                 color: '#722ed1' },
            { title: 'Lodgement',          description: 'Submit IRM allocations to the bank',    icon: <ScheduleOutlined />,  route: '/export-lodgement',     color: '#9254de' },
          ],
        },
        {
          title: 'Incentives',
          tiles: [
            { title: 'Drawback / IGST / RoDTEP', description: 'Claim tracking against shipping bills', icon: <GiftOutlined />, route: '/export-incentive-claims', color: '#eb2f96' },
          ],
        },
        {
          title: 'Quick',
          tiles: [
            { title: 'New Export Invoice', description: 'Create a fresh EI',                     icon: <RocketOutlined />,    route: '/export-invoices/new',  color: '#1677ff' },
          ],
        },
      ]}
    />
  );
}
