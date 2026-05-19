import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { purchaseOrderApi } from '../api/purchaseApi';
import type { POStatus, PurchaseOrder } from '../types/purchase.types';
import TableSkeleton from '../../common/TableSkeleton';

const COLORS: Record<POStatus, string> = { draft: 'default', submitted: 'blue', approved: 'cyan', partial: 'gold', received: 'green', cancelled: 'red', closed: 'purple' };

export default function PurchaseOrdersListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<POStatus | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try { const r = await purchaseOrderApi.list({ search: search || undefined, status, page, per_page: perPage }); setData(r.data); setTotal(r.meta.total); }
    catch { message.error('Failed to load.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const columns: ColumnsType<PurchaseOrder> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Date', dataIndex: 'order_date', key: 'date', width: 120 },
    { title: 'Supplier', key: 'partner', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Reference', dataIndex: 'reference', key: 'ref' },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right' as const, width: 120, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s: POStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Lines', dataIndex: 'lines_count', key: 'lc', width: 70 },
    { title: 'Actions', key: 'a', width: 120, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/purchase-orders/${r.id}`)} />
        {(r.status === 'draft' || r.status === 'submitted') && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/purchase-orders/${r.id}/edit`)} />}
      </Space>
    )},
  ];
  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Purchase orders</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code or reference" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }} style={{ width: 240 }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={(Object.keys(COLORS) as POStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchase-orders/new')}>New PO</Button>
          </Space>
        </Space>
        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={6} />
          : <Table<PurchaseOrder> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={pagination} size="middle" />}
      </Space>
    </Card>
  );
}
