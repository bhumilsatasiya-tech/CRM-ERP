import { Card, Col, Row, Space, Typography } from 'antd';
import {
  ApartmentOutlined, ContactsOutlined, ExperimentOutlined,
  GlobalOutlined, ShoppingOutlined, TeamOutlined, ToolOutlined, UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

/**
 * CRM Gateway — three distinct portions per the operator workflow:
 *
 *   1. Partners & Active Company  — the company we're operating IN; switch + manage.
 *   2. Vendors & Suppliers        — parties we BUY from (material + service).
 *   3. Buyers / Clients           — parties we SELL to (domestic + overseas).
 *
 * The Active Company selector appears ONLY in section 1 — it's the company-level
 * thing, not a partner-type filter. Sections 2 & 3 just list partner types.
 */

interface Tile {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

export default function CrmGateway() {
  const navigate = useNavigate();

  // Section 1: MASTER COMPANY — your own company. Company details + employees only.
  // (Partner Statement moved to centralized Reports → Statement.)
  const section1Tiles: Tile[] = [
    { title: 'Company Details', description: 'Master company info, branches, warehouses',  icon: <ContactsOutlined />, route: '/companies',              color: '#1677ff' },
    { title: 'Employees',       description: 'Internal employee records',                   icon: <TeamOutlined />,     route: '/partners?type=employee', color: '#52c41a' },
  ];

  // Section 2: SUPPLIERS — every party we buy from. No duplicate "New Supplier" tile;
  // adding happens inside the supplier list page itself.
  const section2Tiles: Tile[] = [
    { title: 'Suppliers',          description: 'Material + service suppliers',  icon: <ShoppingOutlined />,   route: '/partners?type=supplier',     color: '#fa8c16' },
    { title: 'Vendors',            description: 'Service providers',             icon: <ToolOutlined />,       route: '/partners?type=vendor',       color: '#faad14' },
    { title: 'Manufacturers',      description: 'Source / OEM manufacturers',    icon: <ExperimentOutlined />, route: '/partners?type=manufacturer', color: '#722ed1' },
    { title: 'Logistic Companies', description: 'Couriers, freight forwarders',  icon: <ApartmentOutlined />,  route: '/partners?type=logistic',     color: '#eb2f96' },
  ];

  // Section 3: CLIENTS / BUYERS — every party we sell to. No duplicate "New Client" tile.
  const section3Tiles: Tile[] = [
    { title: 'Clients',  description: 'Domestic buyers',          icon: <UserOutlined />,   route: '/partners?type=client',   color: '#1677ff' },
    { title: 'Importers', description: 'Overseas / import buyers', icon: <GlobalOutlined />, route: '/partners?type=importer', color: '#13c2c2' },
  ];

  return (
    <div>
      <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 18 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>CRM</Typography.Title>
        <Typography.Text type="secondary">
          Three sections: your own company on top, parties you buy from in the middle, parties you sell to at the bottom.
        </Typography.Text>
      </Space>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* === SECTION 1: MASTER COMPANY === */}
        <Card
          title={<SectionHeader title="1. MASTER COMPANY" subtitle="Your own company — details + employees" />}
          bodyStyle={{ paddingTop: 12 }}
          style={{ borderLeft: '4px solid #1677ff' }}
        >
          <TileGrid tiles={section1Tiles} onNavigate={navigate} />
        </Card>

        {/* === SECTION 2: SUPPLIERS === */}
        <Card
          title={<SectionHeader title="2. SUPPLIERS" subtitle="Parties you BUY from — material, service, manufacturers, logistics" />}
          bodyStyle={{ paddingTop: 12 }}
          style={{ borderLeft: '4px solid #fa8c16' }}
        >
          <TileGrid tiles={section2Tiles} onNavigate={navigate} />
        </Card>

        {/* === SECTION 3: CLIENTS / BUYERS === */}
        <Card
          title={<SectionHeader title="3. CLIENTS / BUYERS" subtitle="Parties you SELL to — domestic clients + overseas importers" />}
          bodyStyle={{ paddingTop: 12 }}
          style={{ borderLeft: '4px solid #722ed1' }}
        >
          <TileGrid tiles={section3Tiles} onNavigate={navigate} />
        </Card>

      </Space>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Space direction="vertical" size={0}>
      <Typography.Text strong style={{ fontSize: 14 }}>{title}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>{subtitle}</Typography.Text>
    </Space>
  );
}

function TileGrid({ tiles, onNavigate }: { tiles: Tile[]; onNavigate: (path: string) => void }) {
  return (
    <Row gutter={[12, 12]}>
      {tiles.map((t) => (
        <Col key={t.title} xs={24} sm={12} md={8} xl={6}>
          <Card
            hoverable
            onClick={() => onNavigate(t.route)}
            bodyStyle={{ padding: 12 }}
            style={{
              cursor: 'pointer',
              borderLeft: `4px solid ${t.color}`,
              height: '100%',
            }}
            className="gateway-tile"
          >
            <Space align="start" size="middle" style={{ width: '100%' }}>
              <div style={{ fontSize: 22, color: t.color, marginTop: 2 }}>{t.icon}</div>
              <Space direction="vertical" size={2} style={{ flex: 1 }}>
                <Typography.Text strong style={{ fontSize: 13 }}>{t.title}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>
                  {t.description}
                </Typography.Text>
              </Space>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
