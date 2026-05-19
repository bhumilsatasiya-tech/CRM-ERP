import { useEffect, useState } from 'react';
import { Button, Card, Input, Progress, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { trackingApi } from '../api/trackingApi';
import type { TrackingDashboardRow } from '../types/tracking.types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default', submitted: 'cyan', approved: 'blue', in_production: 'gold',
  partial: 'orange', invoiced: 'green', cancelled: 'red', closed: 'purple',
};

export default function TrackingDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingDashboardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await trackingApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<TrackingDashboardRow> = [
    { title: 'SO', dataIndex: 'code', key: 'code', width: 160,
      render: (c: string, r) => <Link to={`/tracking/sales-orders/${r.id}`}>{c}</Link> },
    { title: 'Date', dataIndex: 'order_date', key: 'd', width: 110 },
    { title: 'Client', key: 'p', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Status', dataIndex: 'status', key: 's', width: 130,
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? 'default'}>{s}</Tag> },
    { title: 'Total', dataIndex: 'total', key: 'tot', align: 'right' as const, width: 120,
      render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Produced', key: 'pp', width: 160, render: (_, r) => (
      <Progress percent={r.progress.produced_pct} size="small" status={r.progress.produced_pct >= 100 ? 'success' : 'active'}
        format={(p) => `${(p ?? 0).toFixed(0)}% (${r.progress.produced_qty.toFixed(2)} / ${r.progress.ordered_qty.toFixed(2)})`} />
    )},
    { title: 'Invoiced', key: 'ip', width: 160, render: (_, r) => (
      <Progress percent={r.progress.invoiced_pct} size="small" status={r.progress.invoiced_pct >= 100 ? 'success' : 'active'} />
    )},
    { title: 'Paid', key: 'pdp', width: 160, render: (_, r) => (
      <Progress percent={r.progress.paid_pct} size="small" status={r.progress.paid_pct >= 100 ? 'success' : 'active'} />
    )},
    { title: 'Linked', key: 'lk', width: 110, render: (_, r) => (
      <Space size={4}>
        <Tag>{r.batches_count ?? 0} batch</Tag>
        <Tag>{r.invoices_count ?? 0} inv</Tag>
      </Space>
    )},
    { title: 'Action', key: 'a', width: 90, render: (_, r) => (
      <Button size="small" type="link" onClick={() => navigate(`/tracking/sales-orders/${r.id}`)}>Trace</Button>
    )},
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: perPage, total, showSizeChanger: true,
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Order tracking</Typography.Title>
          <Space>
            <Input.Search placeholder="Search SO code / ref" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 240 }} />
            <Select placeholder="Status (default: open)" allowClear style={{ width: 200 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={['draft','submitted','approved','in_production','partial','invoiced','cancelled','closed'].map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
          </Space>
        </Space>
        <Table<TrackingDashboardRow> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
