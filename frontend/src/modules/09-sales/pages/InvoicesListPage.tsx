import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { invoiceApi } from '../api/salesApi';
import type { Invoice, InvoiceStatus } from '../types/sales.types';
import TableSkeleton from '../../common/TableSkeleton';

const COLORS: Record<InvoiceStatus, string> = { draft: 'default', posted: 'blue', partially_paid: 'gold', paid: 'green', cancelled: 'red' };

export default function InvoicesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0); const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<InvoiceStatus | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try { const r = await invoiceApi.list({ search: search || undefined, status, page, per_page: perPage }); setData(r.data); setTotal(r.meta.total); }
    catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<Invoice> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (c: string, r) => <Link to={`/invoices/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Date', dataIndex: 'invoice_date', key: 'd', width: 120 },
    { title: 'Client', key: 'p', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'SO', key: 'so', width: 110, render: (_, r) => r.sales_order_id ? <Link to={`/sales-orders/${r.sales_order_id}`}><Tag color="blue">SO #{r.sales_order_id}</Tag></Link> : '—' },
    { title: 'Total', dataIndex: 'total', key: 'tot', align: 'right' as const, width: 120, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Paid', dataIndex: 'paid_amount', key: 'pd', align: 'right' as const, width: 110, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Balance', dataIndex: 'balance', key: 'bal', align: 'right' as const, width: 110, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'status', key: 's', width: 130, render: (s: InvoiceStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 120, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/invoices/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/invoices/${r.id}/edit`)} />}
      </Space>
    )},
  ];
  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Tax Invoices (domestic)</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={(Object.keys(COLORS) as InvoiceStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>New Tax Invoice</Button>
          </Space>
        </Space>
        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={6} />
          : <Table<Invoice> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />}
      </Space>
    </Card>
  );
}
