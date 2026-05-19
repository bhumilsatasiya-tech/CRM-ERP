import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Tag, Tooltip, Typography, message } from 'antd';
import {
  ArrowDownOutlined, ArrowUpOutlined, AlertOutlined,
  BankOutlined, BookOutlined, CheckSquareOutlined, ClockCircleOutlined,
  DollarCircleOutlined, ExperimentOutlined, FileTextOutlined, FundOutlined, GlobalOutlined,
  InboxOutlined, ReloadOutlined, RiseOutlined, ShoppingCartOutlined, SwapOutlined, TeamOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { dashboardApi, type DashboardKpis } from '../api/dashboardApi';
import Sparkline from '../components/Sparkline';
import MiniBars from '../components/MiniBars';
import TodayTasksPanel from '../components/TodayTasksPanel';
import CompanySelectionPanel from '../components/CompanySelectionPanel';
import { formatFY, fyEnd, fyStart } from '../../../app/fy';

const fmtMoney = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n: number) => Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

interface HeroProps {
  title: string;
  value: number;
  precision?: number;
  prefix?: string;
  icon: React.ReactNode;
  gradient: string;
  spark?: number[];
  trend?: { delta: number; label: string };
  footer?: React.ReactNode;
}

function HeroCard({ title, value, precision = 0, prefix, icon, gradient, spark, trend, footer }: HeroProps) {
  return (
    <Card
      bodyStyle={{ padding: 0 }}
      style={{
        background: gradient,
        color: '#fff',
        border: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</div>
            <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4, lineHeight: 1.1 }}>
              {prefix && <span style={{ fontSize: 18, opacity: 0.85, marginRight: 4 }}>{prefix}</span>}
              {precision > 0 ? fmtMoney(value) : value.toLocaleString()}
            </div>
            {trend && (
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                {trend.delta >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{' '}
                <strong>{Math.abs(trend.delta).toFixed(1)}%</strong> {trend.label}
              </div>
            )}
          </div>
          <div style={{ fontSize: 28, opacity: 0.55 }}>{icon}</div>
        </div>

        {spark && spark.length > 0 && (
          <div style={{ marginTop: 10, opacity: 0.9 }}>
            <Sparkline values={spark} color="rgba(255,255,255,0.95)" fillColor="rgba(255,255,255,0.7)" width={280} height={42} />
          </div>
        )}

        {footer && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>{footer}</div>}
      </div>
    </Card>
  );
}

function StatChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const accent = color ?? '#1677ff';
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 124,
        borderLeft: `3px solid ${accent}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

/** Action-item box — used inside the "Needs your attention" panel. Clickable. */
function ActionItem({ label, value, color, icon, to }: {
  label: string; value: string | number; color: string; icon: React.ReactNode; to: string;
}) {
  return (
    <Link to={to} style={{ display: 'block' }}>
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 6,
          background: '#fafafa',
          borderLeft: `3px solid ${color}`,
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f5ff')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#fafafa')}
      >
        <div style={{ fontSize: 11, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color }}>{icon}</span> {label}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </Link>
  );
}

/** Quick-action tile used in the Quick Actions row. Compact colored icon button. */
function QuickActionTile({ to, icon, color, label }: { to: string; icon: React.ReactNode; color: string; label: string }) {
  return (
    <Col xs={12} sm={8} md={6} xl={3}>
      <Link to={to} style={{ display: 'block' }}>
        <Card
          hoverable
          bodyStyle={{ padding: '12px 10px', textAlign: 'center' }}
          style={{
            borderTop: `3px solid ${color}`,
            transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          }}
          className="gateway-tile"
        >
          <div style={{ fontSize: 22, color, marginBottom: 4 }}>{icon}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#262626', lineHeight: 1.3 }}>{label}</div>
        </Card>
      </Link>
    </Col>
  );
}

/** Subtle section header — gives the dashboard visual rhythm (KEY NUMBERS / TRENDS / ACTIVITY). */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '2px 0 -4px 2px',
      fontSize: 11,
      fontWeight: 700,
      color: '#8c8c8c',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    }}>
      <span style={{ width: 3, height: 14, background: '#1677ff', borderRadius: 2 }} />
      {children}
    </div>
  );
}

export default function DashboardPage() {
  // Default to current Indian FY (1 Apr → 31 Mar)
  const [from, setFrom] = useState<Dayjs>(fyStart());
  const [to, setTo] = useState<Dayjs>(fyEnd().isAfter(dayjs()) ? dayjs() : fyEnd());
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKpis = async () => {
    setLoading(true);
    try { setData(await dashboardApi.kpis(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'))); }
    catch { message.error('Failed to load dashboard.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void fetchKpis(); /* eslint-disable-next-line */ }, []);

  // Derived stats — Net Position (what they owe vs what's owed to them).
  const netPosition = useMemo(() => {
    if (!data) return 0;
    return (data.finance.ar_total ?? 0) - (data.finance.ap_total ?? 0);
  }, [data]);

  // Action-item amounts (anonymous totals — no partner names).
  // Buckets 61-90 + over_90 = "overdue beyond 60 days" — what's actually concerning.
  const arOverdue = useMemo(() => {
    if (!data) return 0;
    return (data.finance.ar_aging?.['61_90'] ?? 0) + (data.finance.ar_aging?.over_90 ?? 0);
  }, [data]);
  const apOverdue = useMemo(() => {
    if (!data) return 0;
    return (data.finance.ap_aging?.['61_90'] ?? 0) + (data.finance.ap_aging?.over_90 ?? 0);
  }, [data]);

  // Sparkline data (last 12 months) — derive from trends.
  const salesSpark = useMemo(() => data?.trends.months.map((m) => m.sales) ?? [], [data]);
  const purchaseSpark = useMemo(() => data?.trends.months.map((m) => m.purchase) ?? [], [data]);
  const producedSpark = useMemo(() => data?.trends.months.map((m) => m.produced) ?? [], [data]);

  // Period-over-period delta (last vs prior month from trends).
  const salesDelta = useMemo(() => {
    const m = data?.trends.months ?? [];
    if (m.length < 2) return 0;
    const cur = m[m.length - 1].sales;
    const prev = m[m.length - 2].sales || 1;
    return ((cur - prev) / prev) * 100;
  }, [data]);
  const purchaseDelta = useMemo(() => {
    const m = data?.trends.months ?? [];
    if (m.length < 2) return 0;
    const cur = m[m.length - 1].purchase;
    const prev = m[m.length - 2].purchase || 1;
    return ((cur - prev) / prev) * 100;
  }, [data]);

  const arBars = useMemo(() => {
    if (!data) return [];
    return [
      { label: '0–30 days',  value: data.finance.ar_aging['0_30'],   color: '#52c41a' },
      { label: '31–60 days', value: data.finance.ar_aging['31_60'],  color: '#faad14' },
      { label: '61–90 days', value: data.finance.ar_aging['61_90'],  color: '#fa8c16' },
      { label: '90+ days',   value: data.finance.ar_aging.over_90,   color: '#cf1322' },
    ];
  }, [data]);

  const apBars = useMemo(() => {
    if (!data) return [];
    return [
      { label: '0–30 days',  value: data.finance.ap_aging['0_30'],   color: '#1677ff' },
      { label: '31–60 days', value: data.finance.ap_aging['31_60'],  color: '#722ed1' },
      { label: '61–90 days', value: data.finance.ap_aging['61_90'],  color: '#eb2f96' },
      { label: '90+ days',   value: data.finance.ap_aging.over_90,   color: '#cf1322' },
    ];
  }, [data]);

  const stockBars = useMemo(() => {
    if (!data) return [];
    return data.inventory.by_warehouse.slice(0, 8).map((w, i) => ({
      label: w.code,
      value: w.value,
      color: ['#13c2c2', '#1677ff', '#722ed1', '#eb2f96', '#fa541c', '#52c41a', '#fadb14', '#a0d911'][i % 8],
    }));
  }, [data]);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
        background: 'linear-gradient(135deg, #f0f7ff 0%, #f9f0ff 100%)',
        padding: '16px 20px', borderRadius: 10,
      }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Dashboard</Typography.Title>
          <Typography.Text type="secondary">Live KPIs · all figures aggregated, no buyer / supplier identities exposed</Typography.Text>
        </div>
        <Space>
          <DatePicker value={from} onChange={(v) => v && setFrom(v)} format="DD MMM YYYY" />
          <span style={{ color: '#888' }}>→</span>
          <DatePicker value={to} onChange={(v) => v && setTo(v)} format="DD MMM YYYY" />
          <Tooltip title="Refresh">
            <a onClick={() => void fetchKpis()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ReloadOutlined /> Refresh
            </a>
          </Tooltip>
        </Space>
      </div>

      {/* Tally "Gateway" — Active Company picker pinned to the top of the dashboard so
          you always know which company you're operating IN, and can switch in one click.
          Once selected, every subsequent voucher / report / screen scopes itself to that
          company via the X-Company-Id header (same as Tally — pick once, work everywhere). */}
      <CompanySelectionPanel />

      <SectionTitle>Quick actions · most-used one-click shortcuts</SectionTitle>
      {/* Quick Actions grid — 8 most-used shortcuts. Single horizontal strip on
          desktop (2 rows of 4 on mid screens, 4 rows of 2 on phone). Each tile
          has a colored icon + label so the operator can scan visually. */}
      <Row gutter={[10, 10]}>
        <QuickActionTile to="/invoices/new"               icon={<DollarCircleOutlined />} color="#1677ff" label="New Invoice" />
        <QuickActionTile to="/purchase-orders/new"        icon={<ShoppingCartOutlined />} color="#fa8c16" label="New PO" />
        <QuickActionTile to="/vouchers/buyer-receipt"     icon={<RiseOutlined />}         color="#52c41a" label="Buyer Receipt" />
        <QuickActionTile to="/vouchers/supplier-payment"  icon={<ShoppingCartOutlined />} color="#fa541c" label="Supplier Payment" />
        <QuickActionTile to="/journal-entries/new"        icon={<FileTextOutlined />}     color="#722ed1" label="New Journal" />
        <QuickActionTile to="/production-batches/new"     icon={<ExperimentOutlined />}   color="#9254de" label="New Batch" />
        <QuickActionTile to="/finance/ledgers"            icon={<BookOutlined />}         color="#13c2c2" label="All Ledgers" />
        <QuickActionTile to="/reports/statement"          icon={<FundOutlined />}         color="#eb2f96" label="Statement Hub" />
      </Row>

      <SectionTitle>Snapshot · net position &amp; what needs your attention</SectionTitle>
      {/* === Net Position + Action Items === */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          {/* Net Position — AR minus AP. Positive = world owes you. Negative = you owe world. */}
          <Card
            loading={loading}
            bodyStyle={{ padding: 18 }}
            style={{
              background: netPosition >= 0
                ? 'linear-gradient(135deg, #f6ffed 0%, #ffffff 70%)'
                : 'linear-gradient(135deg, #fff1f0 0%, #ffffff 70%)',
              borderLeft: `4px solid ${netPosition >= 0 ? '#52c41a' : '#cf1322'}`,
              height: '100%',
            }}
          >
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Typography.Text style={{ fontSize: 11, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Net Financial Position
              </Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, color: netPosition >= 0 ? '#389e0d' : '#cf1322', fontVariantNumeric: 'tabular-nums' }}>
                ₹ {fmtMoney(Math.abs(netPosition))}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {netPosition >= 0
                  ? <>Positive — buyers owe you ₹{fmtCompact(netPosition)} more than you owe suppliers.</>
                  : <>Negative — you owe suppliers ₹{fmtCompact(-netPosition)} more than buyers owe you.</>}
              </Typography.Text>
              <Space size="middle" wrap style={{ marginTop: 8 }}>
                <Typography.Text style={{ fontSize: 12 }}>
                  <ArrowUpOutlined style={{ color: '#52c41a' }} /> AR: <strong>₹ {fmtCompact(data?.finance.ar_total ?? 0)}</strong>
                </Typography.Text>
                <Typography.Text style={{ fontSize: 12 }}>
                  <ArrowDownOutlined style={{ color: '#cf1322' }} /> AP: <strong>₹ {fmtCompact(data?.finance.ap_total ?? 0)}</strong>
                </Typography.Text>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          {/* Action Items — anonymous counts that need attention */}
          <Card
            loading={loading}
            bodyStyle={{ padding: 16 }}
            title={
              <Space>
                <AlertOutlined style={{ color: '#fa8c16' }} />
                <Typography.Text strong style={{ fontSize: 14 }}>Needs your attention</Typography.Text>
              </Space>
            }
            style={{ height: '100%' }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <ActionItem
                  label="AR overdue 60+ days"
                  value={`₹ ${fmtCompact(arOverdue)}`}
                  color="#cf1322"
                  icon={<ClockCircleOutlined />}
                  to="/reports/view/payments-receivable"
                />
              </Col>
              <Col xs={12} md={6}>
                <ActionItem
                  label="AP overdue 60+ days"
                  value={`₹ ${fmtCompact(apOverdue)}`}
                  color="#fa541c"
                  icon={<ClockCircleOutlined />}
                  to="/reports/view/payments-payable"
                />
              </Col>
              <Col xs={12} md={6}>
                <ActionItem
                  label="Overdue tasks"
                  value={data?.tasks.overdue_count ?? 0}
                  color="#fa8c16"
                  icon={<AlertOutlined />}
                  to="/tasks"
                />
              </Col>
              <Col xs={12} md={6}>
                <ActionItem
                  label="Open export IRMs"
                  value={(data?.export.irm_count_received ?? 0) - (data?.export.irm_count_closed ?? 0)}
                  color="#13c2c2"
                  icon={<SwapOutlined />}
                  to="/irms"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <SectionTitle>Key numbers · today&apos;s focus</SectionTitle>
      {/* === KPIs + Today's Focus side by side ===
          Left (≈10/24): 4 small same-size colored boxes in a 2×2 grid (Sales / AR / AP / Stock).
          Right (≈14/24): Today's Focus vertical, spanning the full height of the 2×2 grid.
          On smaller screens both stack 1-per-row. */}
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={10}>
          <Row gutter={[12, 12]}>
            <Col xs={12}>
              <HeroCard
                title="Sales (period)"
                value={data?.sales.invoiced_total ?? 0}
                precision={2}
                prefix="₹"
                icon={<RiseOutlined />}
                gradient="linear-gradient(135deg, #1677ff 0%, #4096ff 100%)"
                spark={salesSpark}
                trend={data ? { delta: salesDelta, label: 'vs prev month' } : undefined}
                footer={<>{data?.sales.invoices_count ?? 0} invoices</>}
              />
            </Col>
            <Col xs={12}>
              <HeroCard
                title="AR outstanding"
                value={data?.finance.ar_total ?? 0}
                precision={2}
                prefix="₹"
                icon={<DollarCircleOutlined />}
                gradient="linear-gradient(135deg, #cf1322 0%, #ff4d4f 100%)"
                footer={<>Owed across customer invoices</>}
              />
            </Col>
            <Col xs={12}>
              <HeroCard
                title="AP outstanding"
                value={data?.finance.ap_total ?? 0}
                precision={2}
                prefix="₹"
                icon={<ShoppingCartOutlined />}
                gradient="linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)"
                footer={<>Owe across supplier invoices</>}
              />
            </Col>
            <Col xs={12}>
              <HeroCard
                title="Stock value"
                value={data?.inventory.stock_value_total ?? 0}
                precision={2}
                prefix="₹"
                icon={<InboxOutlined />}
                gradient="linear-gradient(135deg, #389e0d 0%, #73d13d 100%)"
                footer={<>{data?.inventory.by_warehouse.length ?? 0} warehouses</>}
              />
            </Col>
          </Row>
        </Col>
        <Col xs={24} lg={14}>
          <TodayTasksPanel />
        </Col>
      </Row>

      <SectionTitle>Operations · production, export, remittances, tasks</SectionTitle>
      {/* Secondary KPI strip — same compact style as hero, subtle gradients per accent */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card loading={loading} bodyStyle={{ padding: 16 }}
            style={{ borderLeft: '4px solid #722ed1', background: 'linear-gradient(135deg, #f9f0ff 0%, #ffffff 70%)' }}>
            <Statistic
              title={<><ExperimentOutlined style={{ color: '#722ed1' }} /> Production batches</>}
              value={data?.production.batches_count ?? 0}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Produced {fmtCompact(data?.production.qty_produced ?? 0)} · Scrap {data?.production.scrap_pct ?? 0}%
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card loading={loading} bodyStyle={{ padding: 16 }}
            style={{ borderLeft: '4px solid #13c2c2', background: 'linear-gradient(135deg, #e6fffb 0%, #ffffff 70%)' }}>
            <Statistic
              title={<><GlobalOutlined style={{ color: '#13c2c2' }} /> Export AR (INR)</>}
              value={data?.export.ei_outstanding_inr ?? 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#13c2c2', fontWeight: 700 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {data?.export.ei_count ?? 0} export invoices · paid ₹{fmtCompact(data?.export.ei_paid_inr ?? 0)}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card loading={loading} bodyStyle={{ padding: 16 }}
            style={{ borderLeft: '4px solid #2f54eb', background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 70%)' }}>
            <Statistic
              title={<><BankOutlined style={{ color: '#2f54eb' }} /> Inward remittances</>}
              value={data?.export.irm_count_received ?? 0}
              valueStyle={{ color: '#2f54eb', fontWeight: 700 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Closed {data?.export.irm_count_closed ?? 0} of {data?.export.irm_count_received ?? 0}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card loading={loading} bodyStyle={{ padding: 16 }}
            style={{ borderLeft: '4px solid #fa541c', background: 'linear-gradient(135deg, #fff2e8 0%, #ffffff 70%)' }}>
            <Statistic
              title={<><CheckSquareOutlined style={{ color: '#fa541c' }} /> Open tasks</>}
              value={data?.tasks.open_count ?? 0}
              valueStyle={{ color: '#fa541c', fontWeight: 700 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {(data?.tasks.overdue_count ?? 0) > 0 && <Tag color="red" style={{ marginRight: 4 }}>{data?.tasks.overdue_count} overdue</Tag>}
              Due today {data?.tasks.due_today_count ?? 0}
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <SectionTitle>Trends · last 12 months &amp; aging buckets</SectionTitle>
      {/* Trends + Aging row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Sales vs Purchase — last 12 months" loading={loading} bodyStyle={{ padding: 20 }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span><Tag color="blue">Sales</Tag></span>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {salesDelta >= 0 ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ArrowDownOutlined style={{ color: '#cf1322' }} />}{' '}
                    {Math.abs(salesDelta).toFixed(1)}% vs prev month
                  </span>
                </div>
                <Sparkline values={salesSpark} color="#1677ff" fillColor="#1677ff" width={620} height={70} />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span><Tag color="orange">Purchase</Tag></span>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {purchaseDelta >= 0 ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ArrowDownOutlined style={{ color: '#cf1322' }} />}{' '}
                    {Math.abs(purchaseDelta).toFixed(1)}% vs prev month
                  </span>
                </div>
                <Sparkline values={purchaseSpark} color="#fa8c16" fillColor="#fa8c16" width={620} height={70} />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span><Tag color="purple">Production output</Tag></span>
                  <span style={{ fontSize: 12, color: '#888' }}>quantity per month</span>
                </div>
                <Sparkline values={producedSpark} color="#722ed1" fillColor="#722ed1" width={620} height={50} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
                <span>{data?.trends.months[0]?.label ?? ''}</span>
                <span>{data?.trends.months[data.trends.months.length - 1]?.label ?? ''}</span>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="AR aging — receivables by age" loading={loading} bodyStyle={{ padding: 20 }} size="small">
              <MiniBars bars={arBars} format={(n) => `₹ ${fmtMoney(n)}`} />
            </Card>
            <Card title="AP aging — payables by age" loading={loading} bodyStyle={{ padding: 20 }} size="small">
              <MiniBars bars={apBars} format={(n) => `₹ ${fmtMoney(n)}`} />
            </Card>
          </Space>
        </Col>
      </Row>

      <SectionTitle>Stock &amp; activity · anonymous counters</SectionTitle>
      {/* Stock by warehouse + system pulse */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Stock value by warehouse" loading={loading} bodyStyle={{ padding: 20 }}>
            <MiniBars bars={stockBars} format={(n) => `₹ ${fmtMoney(n)}`} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="System pulse" loading={loading} bodyStyle={{ padding: 20 }}>
            <Space wrap size={12}>
              <StatChip label="Invoices today" value={data?.activity.invoices_today ?? 0} color="#1677ff" />
              <StatChip label="Invoices week"  value={data?.activity.invoices_week  ?? 0} color="#1677ff" />
              <StatChip label="POs today"      value={data?.activity.pos_today      ?? 0} color="#fa8c16" />
              <StatChip label="POs week"       value={data?.activity.pos_week       ?? 0} color="#fa8c16" />
              <StatChip label="Batches today"  value={data?.activity.batches_today  ?? 0} color="#722ed1" />
              <StatChip label="Batches week"   value={data?.activity.batches_week   ?? 0} color="#722ed1" />
              <StatChip label="Journals today" value={data?.activity.journals_today ?? 0} color="#13c2c2" />
              <StatChip label="Journals week"  value={data?.activity.journals_week  ?? 0} color="#13c2c2" />
            </Space>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#888' }}>
              These are anonymous activity counters — they show how busy the system is without revealing who's transacting.
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
