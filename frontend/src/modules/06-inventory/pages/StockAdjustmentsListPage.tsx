import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { stockAdjustmentApi } from '../api/inventoryApi';
import type { AdjustmentStatus, StockAdjustment } from '../types/inventory.types';

const STATUS_COLORS: Record<AdjustmentStatus, string> = {
  draft: 'default', submitted: 'blue', approved: 'green', cancelled: 'red',
};

export default function StockAdjustmentsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StockAdjustment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdjustmentStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await stockAdjustmentApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed to load adjustments.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const columns: ColumnsType<StockAdjustment> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 160, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Date', dataIndex: 'adjustment_date', key: 'date', width: 120 },
    { title: 'Warehouse', key: 'wh', render: (_, row) => row.warehouse ? `${row.warehouse.code} — ${row.warehouse.name}` : '—' },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 130 },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s: AdjustmentStatus) => <Tag color={STATUS_COLORS[s]}>{s}</Tag> },
    { title: 'Lines', dataIndex: 'lines_count', key: 'lines_count', width: 80 },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, row) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/stock/adjustments/${row.id}`)} />
          {row.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/stock/adjustments/${row.id}/edit`)} />}
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: perPage, total, showSizeChanger: true,
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Stock adjustments</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code or notes" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }} style={{ width: 240 }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'approved', label: 'Approved' },
                { value: 'cancelled', label: 'Cancelled' },
              ]} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/stock/adjustments/new')}>New adjustment</Button>
          </Space>
        </Space>

        <Table<StockAdjustment> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
