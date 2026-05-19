import { useEffect, useState } from 'react';
import { Drawer, Badge, Typography, Empty, Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  CalendarOutlined, FileTextOutlined, ShoppingCartOutlined, BankOutlined,
  DollarOutlined, CheckSquareOutlined, ClockCircleOutlined, FireOutlined, RightOutlined,
} from '@ant-design/icons';
import { apiClient } from '../modules/01-auth/api/axiosInstance';
import { useAppSelector } from './hooks';

interface DayActions {
  date: string;
  invoices_draft: number;
  invoices_overdue: number;
  pis_draft: number;
  pis_unpaid: number;
  irms_outstanding: number;
  emis_due_today: number;
  tasks_overdue: number;
  tasks_due_today: number;
}

/**
 * Voucher-of-the-Day Drawer — actionable counters that tell the user "what to do now."
 *
 * Opens via:
 *   - Floating bell button (bottom-right, beside QuickVoucherFab)
 *   - `crm-erp:day-drawer-open` global event
 *
 * Each item shows a count + colored badge + jumps to a filtered list page when clicked.
 * Cached 30s server-side so toggling open/closed doesn't refetch every time.
 */
export default function DayActionsDrawer() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DayActions | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isAuthed = useAppSelector((s) => Boolean(s.auth.user));
  const cid = useAppSelector((s) => s.companies.activeCompanyId);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('crm-erp:day-drawer-open', onOpen);
    return () => window.removeEventListener('crm-erp:day-drawer-open', onOpen);
  }, []);

  // Fetch on open (or on company switch while open)
  useEffect(() => {
    if (!open || !isAuthed || !cid) return;
    setLoading(true);
    apiClient.get<{ data: DayActions }>('/dashboard/day-actions')
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, isAuthed, cid]);

  const go = (route: string) => { navigate(route); setOpen(false); };

  const totalActions = data
    ? data.invoices_draft + data.invoices_overdue + data.pis_draft + data.irms_outstanding
      + data.emis_due_today + data.tasks_overdue + data.tasks_due_today
    : 0;

  return (
    <>
      {/* Floating bell — positioned LEFT of the QuickVoucherFab so they don't overlap */}
      {isAuthed && (
        <Badge count={totalActions} size="small" offset={[-6, 6]} color="#ff4d4f">
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="What to do today (Day Actions)"
            style={{
              position: 'fixed',
              right: 84,         // 24 (fab edge gap) + 56 (fab width) + 4 (spacing)
              bottom: 24,
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #ff7a45, #ff4d4f)',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255,77,79,0.4)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <FireOutlined />
          </button>
        </Badge>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        width={380}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#ff4d4f' }} />
            <span>Today's actions</span>
            <Badge count={totalActions} style={{ backgroundColor: '#ff4d4f' }} />
          </div>
        }
        bodyStyle={{ padding: 0 }}
      >
        {loading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : !data ? (
          <Empty description="Could not load actions" style={{ padding: 48 }} />
        ) : totalActions === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <CheckSquareOutlined style={{ fontSize: 40, color: '#52c41a' }} />
            <Typography.Title level={5} style={{ marginTop: 16 }}>You're all caught up!</Typography.Title>
            <Typography.Text type="secondary">No drafts, overdues, or open items right now.</Typography.Text>
          </div>
        ) : (
          <div>
            <SectionLabel>Sales</SectionLabel>
            <Row icon={<FileTextOutlined style={{ color: '#1677ff' }} />} label="Invoices in draft (post these)"
                 count={data.invoices_draft} color="#1677ff"
                 onClick={() => go('/invoices?status=draft')} />
            <Row icon={<ClockCircleOutlined style={{ color: '#fa541c' }} />} label="Invoices overdue (collect)"
                 count={data.invoices_overdue} color="#fa541c"
                 onClick={() => go('/invoices?overdue=1')} />

            <SectionLabel>Purchase</SectionLabel>
            <Row icon={<ShoppingCartOutlined style={{ color: '#52c41a' }} />} label="PIs in draft (verify)"
                 count={data.pis_draft} color="#52c41a"
                 onClick={() => go('/purchase-invoices?status=draft')} />
            <Row icon={<DollarOutlined style={{ color: '#faad14' }} />} label="PIs unpaid (pay supplier)"
                 count={data.pis_unpaid} color="#faad14"
                 onClick={() => go('/purchase-invoices?unpaid=1')} />

            <SectionLabel>Export & Bank</SectionLabel>
            <Row icon={<BankOutlined style={{ color: '#13c2c2' }} />} label="IRMs outstanding (allocate to EI)"
                 count={data.irms_outstanding} color="#13c2c2"
                 onClick={() => go('/irms?status=outstanding')} />

            <SectionLabel>Finance</SectionLabel>
            <Row icon={<DollarOutlined style={{ color: '#722ed1' }} />} label="EMIs due today / overdue"
                 count={data.emis_due_today} color="#722ed1"
                 onClick={() => go('/loans')} />

            <SectionLabel>My Tasks</SectionLabel>
            <Row icon={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />} label="Tasks overdue"
                 count={data.tasks_overdue} color="#ff4d4f"
                 onClick={() => go('/tasks?status=open&overdue=1')} />
            <Row icon={<CheckSquareOutlined style={{ color: '#fa8c16' }} />} label="Tasks due today"
                 count={data.tasks_due_today} color="#fa8c16"
                 onClick={() => go('/tasks?due=today')} />

            <div style={{ padding: 16, color: '#8c8c8c', fontSize: 11, textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
              Refreshes every 30s · {data.date}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 16px 6px',
      fontSize: 11,
      fontWeight: 600,
      color: '#8c8c8c',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      borderBottom: '1px solid #f5f5f5',
    }}>{children}</div>
  );
}

function Row({
  icon, label, count, color, onClick,
}: { icon: React.ReactNode; label: string; count: number; color: string; onClick: () => void }) {
  const isZero = count === 0;
  return (
    <div
      onClick={isZero ? undefined : onClick}
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid #fafafa',
        cursor: isZero ? 'default' : 'pointer',
        opacity: isZero ? 0.45 : 1,
        transition: 'background 100ms ease',
      }}
      onMouseEnter={(e) => { if (!isZero) e.currentTarget.style.background = '#f5f5f5'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ fontSize: 16 }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 13 }}>{label}</div>
      <Badge
        count={count}
        showZero={false}
        style={{ backgroundColor: isZero ? '#d9d9d9' : color, color: '#fff' }}
      />
      {!isZero && <RightOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />}
    </div>
  );
}
