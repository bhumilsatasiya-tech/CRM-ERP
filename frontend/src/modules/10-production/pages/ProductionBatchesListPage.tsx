import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { productionApi } from '../api/productionApi';
import type { ProductionBatch, ProductionStatus } from '../types/production.types';
import TableSkeleton from '../../common/TableSkeleton';

const COLORS: Record<ProductionStatus, string> = {
  draft: 'default', submitted: 'cyan', approved: 'blue', in_progress: 'gold',
  completed: 'green', cancelled: 'red',
};

export default function ProductionBatchesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProductionBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductionStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await productionApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<ProductionBatch> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (c: string, r) => <Link to={`/production-batches/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Plan start', dataIndex: 'planned_start_date', key: 'd', width: 120 },
    { title: 'Target product', key: 'tp', render: (_, r) => r.target_product ? `${r.target_product.code} — ${r.target_product.name}` : '—' },
    { title: 'SO', key: 'so', width: 120, render: (_, r) => r.sales_order_id
      ? <Link to={`/sales-orders/${r.sales_order_id}`}><Tag color="blue">SO #{r.sales_order_id}</Tag></Link>
      : '—' },
    { title: 'Planned', dataIndex: 'qty_planned', key: 'qp', align: 'right' as const, width: 100, render: (v: number) => Number(v).toFixed(3) },
    { title: 'Produced', dataIndex: 'qty_produced', key: 'qpd', align: 'right' as const, width: 100, render: (v: number) => Number(v).toFixed(3) },
    { title: 'Failed', dataIndex: 'qty_failed', key: 'qf', align: 'right' as const, width: 90, render: (v: number) => Number(v).toFixed(3) },
    { title: 'Material cost', dataIndex: 'material_cost', key: 'mc', align: 'right' as const, width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'status', key: 's', width: 130, render: (s: ProductionStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 120, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/production-batches/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/production-batches/${r.id}/edit`)} />}
      </Space>
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
          <Typography.Title level={4} style={{ margin: 0 }}>Production batches</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(COLORS) as ProductionStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/production-batches/new')}>New batch</Button>
          </Space>
        </Space>
        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={6} />
          : <Table<ProductionBatch> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />}
      </Space>
    </Card>
  );
}
