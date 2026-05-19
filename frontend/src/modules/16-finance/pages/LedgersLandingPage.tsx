import { useEffect, useState } from 'react';
import { Card, Col, Modal, Row, Space, Typography } from 'antd';
import {
  BankOutlined, BookOutlined, DollarCircleOutlined, GoldOutlined,
  RiseOutlined, ShoppingCartOutlined, SolutionOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '../api/financeApi';
import type { Account } from '../types/finance.types';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';

interface Tile {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export default function LedgersLandingPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);

  useEffect(() => {
    accountApi.list({ per_page: 500 }).then((r) => setAccounts(r.data)).catch(() => undefined);
  }, []);

  /** Find first matching account by code prefix. Returns ID or null. */
  const findId = (codePrefix: string): number | null =>
    accounts.find((a) => a.code === codePrefix)?.id
    ?? accounts.find((a) => a.code.startsWith(codePrefix))?.id
    ?? null;

  const openAccountLedger = (codePrefix: string, fallbackMessage: string) => {
    const id = findId(codePrefix);
    if (id) {
      navigate(`/finance/ledger/${id}`);
    } else {
      Modal.warning({ title: 'Account not found', content: fallbackMessage });
    }
  };

  const tiles: Tile[] = [
    {
      key: 'account', title: 'Account Ledger',
      description: 'Browse any account — pick from Chart of Accounts and see all movements with running balance.',
      icon: <BookOutlined />, color: '#1677ff',
      onClick: () => navigate('/finance/ledger'),
    },
    {
      key: 'partner', title: 'Partner Statement',
      description: 'Per-buyer or per-supplier statement — invoices, payments, IRMs, with opening + closing balance.',
      icon: <TeamOutlined />, color: '#9254de',
      onClick: () => setPartnerModalOpen(true),
    },
    {
      key: 'bank', title: 'Bank Book',
      description: 'All transactions on the Bank account — deposits, withdrawals, transfers, charges.',
      icon: <BankOutlined />, color: '#13c2c2',
      onClick: () => openAccountLedger('1100', 'No Bank account (code 1100) found. Seed Finance defaults or create it manually.'),
    },
    {
      key: 'cash', title: 'Cash Book',
      description: 'All transactions on the Cash account — receipts, payments, petty cash.',
      icon: <DollarCircleOutlined />, color: '#52c41a',
      onClick: () => openAccountLedger('1110', 'No Cash account (code 1110) found. Seed Finance defaults or create it manually.'),
    },
    {
      key: 'loan', title: 'Loan Ledger',
      description: 'EMI schedules + payment history per loan. Open any loan to see its full lifecycle.',
      icon: <GoldOutlined />, color: '#fa8c16',
      onClick: () => navigate('/loans'),
    },
    {
      key: 'capital', title: 'Capital / Proprietor',
      description: 'Owner contributions and draws against the Capital account.',
      icon: <SolutionOutlined />, color: '#eb2f96',
      onClick: () => openAccountLedger('3100', 'No Capital account (code 3100) found. Seed Finance defaults or create it manually.'),
    },
    {
      key: 'buyer-receipt', title: 'Buyer Receipt (voucher)',
      description: 'Record a lump-sum receipt from a buyer — auto-allocates oldest-first across their open invoices.',
      icon: <RiseOutlined />, color: '#2f54eb',
      onClick: () => navigate('/vouchers/buyer-receipt'),
    },
    {
      key: 'supplier-payment', title: 'Supplier Payment (voucher)',
      description: 'Record a lump-sum payment to a supplier — auto-allocates oldest-first across their open purchase invoices.',
      icon: <ShoppingCartOutlined />, color: '#fa541c',
      onClick: () => navigate('/vouchers/supplier-payment'),
    },
  ];

  return (
    <>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Books &amp; Ledgers</Typography.Title>
          <Typography.Text type="secondary">
            All money in / money out flows through one ledger. Pick a view below to see a specific slice.
          </Typography.Text>

          <Row gutter={[16, 16]}>
            {tiles.map((t) => (
              <Col key={t.key} xs={24} sm={12} md={8}>
                <Card hoverable onClick={t.onClick} style={{ cursor: 'pointer', borderLeft: `4px solid ${t.color}`, height: '100%' }}>
                  <Space align="start" size="middle" style={{ width: '100%' }}>
                    <div style={{ fontSize: 28, color: t.color }}>{t.icon}</div>
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong style={{ fontSize: 16 }}>{t.title}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t.description}</Typography.Text>
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      <Modal
        title="Open partner statement"
        open={partnerModalOpen}
        onCancel={() => setPartnerModalOpen(false)}
        footer={null}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Text type="secondary">Pick a partner to see their full statement.</Typography.Text>
          <PartnerSmartDropdown
            placeholder="Search by name, code, GST..."
            onPartnerSelect={(p) => {
              if (p?.id) {
                setPartnerModalOpen(false);
                navigate(`/partners/${p.id}/statement`);
              }
            }}
          />
        </Space>
      </Modal>
    </>
  );
}
