import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { grnApi } from '../api/purchaseApi';
import type { Grn, GrnStatus } from '../types/purchase.types';

const COLORS: Record<GrnStatus, string> = { draft: 'default', received: 'green', cancelled: 'red' };

export default function GrnsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Grn[]>([]);
  const [total, setTotal] = useState(0); const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<GrnStatus | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try { const r = await grnApi.list({ search: search || undefined, status, page, per_page: perPage }); setData(r.data); setTotal(r.meta.total); }
    catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<Grn> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Date', dataIndex: 'grn_date', key: 'd', width: 120 },
    { title: 'Supplier', key: 'p', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Warehouse', key: 'w', render: (_, r) => r.warehouse ? r.warehouse.code : '—' },
    { title: 'Supplier inv #', dataIndex: 'supplier_invoice_no', key: 'sinv' },
    { title: 'Status', dataIndex: 'status', key: 's', width: 110, render: (s: GrnStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Lines', dataIndex: 'lines_count', key: 'lc', width: 70 },
    { title: 'Actions', key: 'a', width: 120, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/grns/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/grns/${r.id}/edit`)} />}
      </Space>
    )},
  ];
  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Goods Receipts (GRN)</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code or invoice no" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 240 }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={(Object.keys(COLORS) as GrnStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/grns/new')}>New GRN</Button>
          </Space>
        </Space>
        <Table<Grn> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
