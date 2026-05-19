import {
  ApartmentOutlined, BankOutlined, FileTextOutlined, FormOutlined,
  HistoryOutlined, KeyOutlined, MailOutlined, NumberOutlined,
  SafetyCertificateOutlined, SettingOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function SettingsGateway() {
  return (
    <ModuleGateway
      title="Settings"
      subtitle="Company structure, users, roles, sequences, templates, communication."
      sections={[
        {
          title: 'Organization',
          tiles: [
            { title: 'Companies',     description: 'Add / edit companies',         icon: <BankOutlined />,        route: '/companies', color: '#1677ff' },
            { title: 'Branches',      description: 'Branch / office records',      icon: <ApartmentOutlined />,   route: '/branches',  color: '#13c2c2' },
            { title: 'Warehouses',    description: 'Stock locations',              icon: <BankOutlined />,        route: '/warehouses', color: '#52c41a' },
          ],
        },
        {
          title: 'Users & access',
          tiles: [
            { title: 'Users',         description: 'User accounts',                icon: <UserOutlined />,        route: '/users',     color: '#722ed1' },
            { title: 'Roles',         description: 'Permission sets',              icon: <KeyOutlined />,         route: '/roles',     color: '#9254de' },
            { title: 'My companies',  description: 'Switch which companies I see', icon: <TeamOutlined />,        route: '/me/companies', color: '#fa8c16' },
          ],
        },
        {
          title: 'Templates & sequences',
          tiles: [
            { title: 'Document templates', description: 'Edit PDF templates per doc type', icon: <FormOutlined />,    route: '/document-templates',   color: '#eb2f96' },
            { title: 'Sequences',          description: 'Auto-numbering format per doc',   icon: <NumberOutlined />,  route: '/sequences',            color: '#fa541c' },
          ],
        },
        {
          title: 'Communication',
          tiles: [
            { title: 'Messages',       description: 'Email / WhatsApp log',         icon: <MailOutlined />,        route: '/comm/messages',  color: '#13c2c2' },
            { title: 'Templates',      description: 'Message body templates',       icon: <FileTextOutlined />,    route: '/comm/templates', color: '#1677ff' },
          ],
        },
        {
          title: 'Security',
          tiles: [
            { title: 'Security & Module Locks', description: 'PIN-lock Project Costing / Production / Export & Bank. Set or change your PIN.', icon: <SafetyCertificateOutlined />, route: '/settings/security', color: '#fa8c16', badge: 'New' },
          ],
        },
        {
          title: 'System',
          tiles: [
            { title: 'Settings',      description: 'Application + company settings', icon: <SettingOutlined />,    route: '/settings',  color: '#595959' },
            { title: 'Audit log',     description: 'Who changed what, when',         icon: <HistoryOutlined />,    route: '/audit-logs', color: '#595959' },
          ],
        },
      ]}
    />
  );
}
