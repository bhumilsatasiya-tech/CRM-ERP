import {
  AppstoreOutlined, DeploymentUnitOutlined, ExperimentOutlined,
  GoldOutlined, TagsOutlined,
} from '@ant-design/icons';
import ModuleGateway from '../ModuleGateway';

export default function ProductsGateway() {
  return (
    <ModuleGateway
      title="Products (Master data)"
      subtitle="Catalog of products, categories, units of measure, and production formulas (BOM)."
      sections={[
        {
          title: 'Catalog',
          tiles: [
            { title: 'Products',         description: 'Raw, finished, packaging, service items',  icon: <AppstoreOutlined />,        route: '/products',         color: '#1677ff' },
            { title: 'Categories',       description: 'Hierarchical product groups',              icon: <TagsOutlined />,            route: '/product-categories', color: '#13c2c2' },
            { title: 'Units of measure', description: 'kg, g, L, pcs, box, drum…',                icon: <GoldOutlined />,            route: '/product-units',     color: '#52c41a' },
          ],
        },
        {
          title: 'Formulas (BOM)',
          tiles: [
            { title: 'Formulas',         description: 'Versioned bills-of-materials per product', icon: <ExperimentOutlined />,      route: '/formulas',          color: '#722ed1' },
            { title: 'New Formula',      description: 'Start a fresh BOM',                        icon: <DeploymentUnitOutlined />,  route: '/formulas/new',      color: '#722ed1' },
          ],
        },
      ]}
    />
  );
}
