import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { taxInvoiceApi } from '../api/exportApi';
import type { TaxInvoice, TaxInvoiceStatus } from '../types/taxInvoice.types';

const COLORS: Record<TaxInvoiceStatus, string> = { draft: 'default', posted: 'green', cancelled: 'red' };

export default function TaxInvoicesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TaxInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaxInvoiceStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await taxInvoiceApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<TaxInvoice> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 160, render: (c: string, r) => <Link to={`/tax-invoices/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Export invoice', key: 'ei', width: 170, render: (_, r) => r.export_invoice ? <Link to={`/export-invoices/${r.export_invoice.id}`}><Tag color="blue">{r.export_invoice.code}</Tag></Link> : '—' },
    { title: 'Partner', key: 'pa', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Date', dataIndex: 'invoice_date', key: 'd', width: 120 },
    { title: 'CCY', dataIndex: 'currency', key: 'c', width: 70 },
    { title: 'X-rate', dataIndex: 'exchange_rate', key: 'x', width: 100, align: 'right', render: (v: number) => (Number(v) || 0).toFixed(4) },
    { title: 'Total (CCY)', dataIndex: 'total', key: 't', width: 130, align: 'right', render: (v: number) => (Number(v) || 0).toFixed(2) },
    { title: 'Total (INR)', dataIndex: 'total_inr', key: 'ti', width: 130, align: 'right', render: (v: number) => (Number(v) || 0).toFixed(2) },
    { title: 'Tax type', dataIndex: 'tax_type', key: 'tt', width: 110, render: (v: string) => v.toUpperCase() },
    { title: 'Status', dataIndex: 'status', key: 's', width: 110, render: (s: TaxInvoiceStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 110, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/tax-invoices/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/tax-invoices/${r.id}/edit`)} />}
      </Space>
    )},
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Tax invoices (export — INR)</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(COLORS) as TaxInvoiceStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tax-invoices/new')}>New tax invoice</Button>
          </Space>
        </Space>
        <Table<TaxInvoice> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
