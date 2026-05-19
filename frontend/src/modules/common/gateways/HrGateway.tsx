import {
  CalendarOutlined, DollarCircleOutlined, FileTextOutlined,
  TeamOutlined, ToolOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function HrGateway() {
  return (
    <ModuleGateway
      title="HR & Payroll"
      subtitle="Employees, designations, salary components, monthly payroll runs."
      sections={[
        {
          title: 'People',
          tiles: [
            { title: 'Employees',           description: 'Employee master with KYC + bank details', icon: <TeamOutlined />,    route: '/employees',         color: '#1677ff' },
            { title: 'Designations',        description: 'Job titles / roles',                       icon: <ToolOutlined />,    route: '/designations',      color: '#13c2c2' },
          ],
        },
        {
          title: 'Payroll',
          tiles: [
            { title: 'Salary components',   description: 'Earnings & deductions master',             icon: <DollarCircleOutlined />, route: '/salary-components', color: '#fa8c16' },
            { title: 'Salary runs',         description: 'Monthly payroll — prepare, post, pay',     icon: <CalendarOutlined />,     route: '/salary-runs',       color: '#722ed1' },
          ],
        },
        {
          title: 'Tasks',
          tiles: [
            { title: 'Tasks & reminders',   description: 'Daily checklist + assignments',            icon: <FileTextOutlined />,     route: '/tasks',             color: '#52c41a' },
          ],
        },
      ]}
    />
  );
}
