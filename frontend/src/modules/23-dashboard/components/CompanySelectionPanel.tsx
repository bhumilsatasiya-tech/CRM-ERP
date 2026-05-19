import { useEffect } from 'react';
import { Avatar, Button, Card, Dropdown, Empty, Space, Tag, Tooltip, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  BankOutlined, CheckCircleFilled, DownOutlined, EnvironmentOutlined,
  IdcardOutlined, PlusOutlined, SwapOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchMyCompaniesThunk, setActiveCompanyThunk } from '../../02-companies/store/companiesSlice';
import { formatFY } from '../../../app/fy';
import type { Company } from '../../02-companies/types/companies.types';

/**
 * "Master Company" panel for the Dashboard.
 *
 * Tally pattern simplified: you pick ONE master company; every voucher,
 * report, partner, and journal entry from that point forward lives inside it.
 * No always-visible "switch to X" tile grid — that was confusing. Instead:
 *
 *  - Hero card shows the current master company prominently
 *  - One "Change ▼" button opens a dropdown of all companies you have access to
 *  - If only one company exists, the button becomes "+ Add another company"
 *
 * The actual data scoping (X-Company-Id header on every API call, cache flush
 * on switch) is unchanged — this is purely a UI simplification.
 */
export default function CompanySelectionPanel() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, activeCompanyId, status, hasAllCompaniesAccess } = useAppSelector((s) => s.companies);

  useEffect(() => {
    if (status === 'idle') void dispatch(fetchMyCompaniesThunk());
  }, [status, dispatch]);

  const active = list.find((c) => c.id === activeCompanyId);

  const onSwitch = async (id: number) => {
    if (id === activeCompanyId) return;
    const r = await dispatch(setActiveCompanyThunk(id));
    if (r.meta.requestStatus === 'fulfilled') {
      message.success('Switched master company.');
      window.dispatchEvent(new CustomEvent('crm-erp:company-switched', { detail: { companyId: id } }));
      navigate('/', { replace: true });
    } else {
      message.error('Could not switch company.');
    }
  };

  return (
    <Card
      bodyStyle={{ padding: '16px 22px' }}
      style={{
        background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 70%)',
        border: '1px solid #d6e4ff',
        marginBottom: 16,
      }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
          <Typography.Text style={{ fontSize: 11, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Master Company &middot; All accounting happens here
          </Typography.Text>
          {hasAllCompaniesAccess && (
            <Button size="small" type="link" onClick={() => navigate('/companies')}>Manage companies</Button>
          )}
        </Space>

        {active ? (
          <Space size="middle" align="start" style={{ width: '100%' }}>
            <Avatar
              size={56}
              shape="square"
              style={{
                background: typeColor(active.type),
                color: '#fff',
                fontWeight: 700,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {(active.code ?? active.name ?? '?').slice(0, 2).toUpperCase()}
            </Avatar>
            <Space direction="vertical" size={2} style={{ flex: 1 }}>
              <Space size="small" wrap>
                <Typography.Title level={4} style={{ margin: 0 }}>{active.name}</Typography.Title>
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
              </Space>
              <Space size="small" wrap>
                <Tag color="default" style={{ margin: 0 }}>{active.code}</Tag>
                <Tag color={typeAccent(active.type)} style={{ margin: 0 }}>{active.type}</Tag>
                <Tag color="geekblue" style={{ margin: 0 }}>{formatFY()}</Tag>
              </Space>
              <CompanyMeta company={active} />
            </Space>

            {/* The ONE clear action: change company. Dropdown if > 1, else Add button. */}
            <div style={{ alignSelf: 'center' }}>
              {list.length > 1 ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    selectable: true,
                    selectedKeys: active ? [String(active.id)] : [],
                    items: list.map((c) => ({
                      key: String(c.id),
                      label: (
                        <Space>
                          <Avatar size={22} shape="square" style={{ background: typeColor(c.type), color: '#fff', fontWeight: 600, fontSize: 11 }}>
                            {(c.code ?? c.name ?? '?').slice(0, 2).toUpperCase()}
                          </Avatar>
                          <span style={{ fontWeight: c.id === active.id ? 600 : 400 }}>
                            {c.name}
                            <Tag color={typeAccent(c.type)} style={{ marginLeft: 6 }}>{c.type}</Tag>
                            {c.id === active.id && <Tag color="green" style={{ marginLeft: 2 }}>master</Tag>}
                          </span>
                        </Space>
                      ),
                      onClick: () => void onSwitch(c.id),
                    })) as MenuProps['items'],
                  }}
                >
                  <Button type="primary" icon={<SwapOutlined />}>
                    Change <DownOutlined />
                  </Button>
                </Dropdown>
              ) : (
                <Tooltip title="Add another company to enable switching">
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/companies/new')}>
                    Add another company
                  </Button>
                </Tooltip>
              )}
            </div>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={status === 'loading' ? 'Loading companies…' : 'No master company set.'}
            style={{ padding: 16 }}
          >
            {hasAllCompaniesAccess && status === 'ready' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/companies/new')}>
                Create your first company
              </Button>
            )}
          </Empty>
        )}
      </Space>
    </Card>
  );
}

function CompanyMeta({ company }: { company: Company }) {
  const bits: React.ReactNode[] = [];
  if (company.gst_no) {
    bits.push(<span key="gst" style={{ marginRight: 14 }}><IdcardOutlined /> GST {company.gst_no}</span>);
  }
  if (company.pan_no) {
    bits.push(<span key="pan" style={{ marginRight: 14 }}><BankOutlined /> PAN {company.pan_no}</span>);
  }
  if (company.address?.city || company.address?.country) {
    const loc = [company.address?.city, company.address?.country].filter(Boolean).join(', ');
    bits.push(<span key="loc" style={{ marginRight: 14 }}><EnvironmentOutlined /> {loc}</span>);
  }
  if (bits.length === 0) return null;
  return (
    <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
      {bits}
    </Typography.Text>
  );
}

function typeColor(type?: string): string {
  switch (type) {
    case 'export':    return '#1677ff';
    case 'supplying': return '#722ed1';
    case 'trading':   return '#13c2c2';
    default:          return '#8c8c8c';
  }
}

function typeAccent(type?: string): string {
  switch (type) {
    case 'export':    return 'blue';
    case 'supplying': return 'purple';
    case 'trading':   return 'cyan';
    default:          return 'default';
  }
}
