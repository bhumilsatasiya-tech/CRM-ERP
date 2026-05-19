import {
  CheckCircleOutlined, DeploymentUnitOutlined, ExperimentOutlined,
  ToolOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function ProductionGateway() {
  return (
    <ModuleGateway
      title="Production"
      subtitle="Batches (trial / final / QC), inputs, outputs, quality checks, and order tracking."
      sections={[
        {
          title: 'Batches',
          tiles: [
            { title: 'All batches',         description: 'Browse + filter every batch',          icon: <UnorderedListOutlined />, route: '/production-batches',     color: '#1677ff' },
            { title: 'New production batch', description: 'Plan inputs + outputs, complete to write stock', icon: <ExperimentOutlined />, route: '/production-batches/new', color: '#722ed1' },
          ],
        },
        {
          title: 'Workflow',
          tiles: [
            { title: 'Order tracking',      description: 'Trace SO → production → invoice → payment', icon: <DeploymentUnitOutlined />, route: '/tracking',             color: '#13c2c2' },
            { title: 'Quality checks',      description: 'Pass / fail records per batch',         icon: <CheckCircleOutlined />,    route: '/production-batches',   color: '#52c41a' },
            { title: 'Formulas (BOM)',      description: 'Use formula to auto-fill batch inputs', icon: <ToolOutlined />,            route: '/formulas',             color: '#fa8c16' },
          ],
        },
      ]}
    />
  );
}
