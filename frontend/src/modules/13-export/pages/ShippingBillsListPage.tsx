import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { shippingBillApi } from '../api/exportApi';
import type { ShippingBill, ShippingBillStatus } from '../types/export.types';

const COLORS: Record<ShippingBillStatus, string> = { draft: 'default', dispatched: 'green', cancelled: 'red' };

export default function ShippingBillsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ShippingBill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ShippingBillStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await shippingBillApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<ShippingBill> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (c: string, r) => <Link to={`/shipping-bills/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Export invoice', key: 'ei', width: 160, render: (_, r) => r.export_invoice ? <Link to={`/export-invoices/${r.export_invoice.id}`}><Tag color="blue">{r.export_invoice.code}</Tag></Link> : '—' },
    { title: 'BL no.', dataIndex: 'bl_no', key: 'bl', width: 140 },
    { title: 'BL date', dataIndex: 'bl_date', key: 'bd', width: 110 },
    { title: 'Vessel', dataIndex: 'vessel_name', key: 'vsl' },
    { title: 'Carrier', dataIndex: 'carrier', key: 'car', width: 130 },
    { title: 'POL → POD', key: 'ports', render: (_, r) => `${r.port_of_loading ?? '—'} → ${r.port_of_discharge ?? '—'}` },
    { title: 'Status', dataIndex: 'status', key: 's', width: 130, render: (s: ShippingBillStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 110, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/shipping-bills/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/shipping-bills/${r.id}/edit`)} />}
      </Space>
    )},
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Shipping bills</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(COLORS) as ShippingBillStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
          </Space>
        </Space>
        <Table<ShippingBill> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
