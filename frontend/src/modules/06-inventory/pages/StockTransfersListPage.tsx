import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { stockTransferApi } from '../api/inventoryApi';
import type { StockTransfer, TransferStatus } from '../types/inventory.types';

const STATUS_COLORS: Record<TransferStatus, string> = {
  draft: 'default', sent: 'orange', received: 'green', cancelled: 'red',
};

export default function StockTransfersListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StockTransfer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TransferStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await stockTransferApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed to load transfers.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const columns: ColumnsType<StockTransfer> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 160, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Date', dataIndex: 'transfer_date', key: 'date', width: 120 },
    { title: 'From', key: 'from', render: (_, row) => row.from_warehouse ? `${row.from_warehouse.code}` : `#${row.from_warehouse_id}` },
    { title: 'To',   key: 'to',   render: (_, row) => row.to_warehouse   ? `${row.to_warehouse.code}`   : `#${row.to_warehouse_id}` },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s: TransferStatus) => <Tag color={STATUS_COLORS[s]}>{s}</Tag> },
    { title: 'Lines', dataIndex: 'lines_count', key: 'lines_count', width: 80 },
    { title: 'Expected', dataIndex: 'expected_arrival_date', key: 'eta', width: 120 },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, row) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/stock/transfers/${row.id}`)} />
          {row.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/stock/transfers/${row.id}/edit`)} />}
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
          <Typography.Title level={4} style={{ margin: 0 }}>Stock transfers</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent (in transit)' },
                { value: 'received', label: 'Received' },
                { value: 'cancelled', label: 'Cancelled' },
              ]} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/stock/transfers/new')}>New transfer</Button>
          </Space>
        </Space>

        <Table<StockTransfer> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
