import { useState } from 'react';
import { Card, Col, Modal, Row, Space, Typography } from 'antd';
import {
  ApartmentOutlined, BankOutlined, BookOutlined, ContactsOutlined, DollarCircleOutlined,
  ExperimentOutlined, GiftOutlined, GoldOutlined, GlobalOutlined, RiseOutlined,
  ShoppingOutlined, ToolOutlined, UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PartnerSmartDropdown from '../PartnerSmartDropdown';
import type { PartnerType } from '../../04-crm/types/crm.types';

/**
 * Statement Hub — the centralized accounting statement module.
 *
 * Flow (single-touch access):
 *   Reports → Statement → pick category → pick party → pick FY → open
 *
 * 13 categories per the centralized-ERP spec, covering every kind of ledger
 * the accounting system tracks. Same card/tile style as the other gateways
 * (no design changes, per the spec).
 */

interface Tile {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export default function StatementHub() {
  const navigate = useNavigate();
  const [picker, setPicker] = useState<{ open: boolean; partnerType?: PartnerType; label: string }>({ open: false, label: '' });

  const openPartnerPicker = (label: string, partnerType: PartnerType) =>
    setPicker({ open: true, partnerType, label });

  const tiles: Tile[] = [
    { title: 'Master Company',     description: "Your own company's P&L + Balance Sheet for the FY",  icon: <ContactsOutlined />,    color: '#1677ff', onClick: () => navigate('/reports/view/profit-and-loss') },
    { title: 'Suppliers',          description: 'Per-supplier ledger (year-wise)',                     icon: <ShoppingOutlined />,    color: '#fa8c16', onClick: () => openPartnerPicker('Supplier', 'supplier') },
    { title: 'Vendors',            description: 'Per-vendor ledger (year-wise)',                       icon: <ToolOutlined />,        color: '#faad14', onClick: () => openPartnerPicker('Vendor', 'vendor') },
    { title: 'Manufacturers',      description: 'Per-manufacturer ledger',                             icon: <ExperimentOutlined />,  color: '#722ed1', onClick: () => openPartnerPicker('Manufacturer', 'manufacturer') },
    { title: 'Logistic Companies', description: 'Per-logistic-company ledger',                         icon: <ApartmentOutlined />,   color: '#eb2f96', onClick: () => openPartnerPicker('Logistic Company', 'logistic') },
    { title: 'Clients',            description: 'Per-client ledger (domestic buyers)',                 icon: <UserOutlined />,        color: '#1677ff', onClick: () => openPartnerPicker('Client', 'client') },
    { title: 'Buyers',             description: 'Same as Clients — for accounting clarity',            icon: <UserOutlined />,        color: '#2f54eb', onClick: () => openPartnerPicker('Buyer', 'client') },
    { title: 'Importers',          description: 'Per-importer ledger (overseas)',                      icon: <GlobalOutlined />,      color: '#13c2c2', onClick: () => openPartnerPicker('Importer', 'importer') },
    { title: 'Banks',              description: 'Bank account movements (Bank Book)',                   icon: <BankOutlined />,        color: '#1677ff', onClick: () => navigate('/finance/ledger') },
    { title: 'Creditors',          description: 'AP-side — every party we owe money to',                icon: <DollarCircleOutlined />, color: '#fa541c', onClick: () => navigate('/reports/view/payments-payable') },
    { title: 'Debitors',           description: 'AR-side — every party that owes us money',             icon: <RiseOutlined />,        color: '#52c41a', onClick: () => navigate('/reports/view/payments-receivable') },
    { title: 'Borrowings / Loans', description: 'EMI schedule + repayments per loan',                   icon: <GoldOutlined />,        color: '#fa8c16', onClick: () => navigate('/loans') },
    { title: 'Other Ledgers',      description: 'Any chart-of-accounts row (Capital, Tax, Expense)',    icon: <GiftOutlined />,        color: '#9254de', onClick: () => navigate('/finance/ledger') },
  ];

  return (
    <div>
      <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 18 }}>
        <Space size="middle">
          <BookOutlined style={{ fontSize: 22, color: '#9254de' }} />
          <Typography.Title level={3} style={{ margin: 0 }}>Statement Hub</Typography.Title>
        </Space>
        <Typography.Text type="secondary">
          One place for every ledger statement in the accounting system. Pick a category → pick a party → pick the financial year → open.
        </Typography.Text>
      </Space>

      <Row gutter={[12, 12]}>
        {tiles.map((t) => (
          <Col key={t.title} xs={24} sm={12} md={8} xl={6}>
            <Card
              hoverable
              onClick={t.onClick}
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
                  <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>{t.description}</Typography.Text>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={`Open ${picker.label} Statement`}
        open={picker.open}
        onCancel={() => setPicker({ open: false, label: '' })}
        footer={null}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Pick the {picker.label.toLowerCase()} you want to view. You can switch the financial year on the next screen.
          </Typography.Text>
          <PartnerSmartDropdown
            type={picker.partnerType}
            placeholder={`Search ${picker.label.toLowerCase()}...`}
            onPartnerSelect={(p) => {
              if (p?.id) {
                setPicker({ open: false, label: '' });
                navigate(`/partners/${p.id}/statement`);
              }
            }}
          />
        </Space>
      </Modal>
    </div>
  );
}
