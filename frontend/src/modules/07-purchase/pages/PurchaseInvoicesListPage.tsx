import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { purchaseInvoiceApi } from '../api/purchaseApi';
import type { PIStatus, PurchaseInvoice } from '../types/purchase.types';

const COLORS: Record<PIStatus, string> = { draft: 'default', posted: 'blue', partially_paid: 'gold', paid: 'green', cancelled: 'red' };

export default function PurchaseInvoicesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PurchaseInvoice[]>([]);
  const [total, setTotal] = useState(0); const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<PIStatus | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try { const r = await purchaseInvoiceApi.list({ search: search || undefined, status, page, per_page: perPage }); setData(r.data); setTotal(r.meta.total); }
    catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<PurchaseInvoice> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Date', dataIndex: 'invoice_date', key: 'd', width: 120 },
    { title: 'Supplier', key: 'p', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Supplier inv #', dataIndex: 'supplier_invoice_no', key: 'sinv' },
    { title: 'Total', dataIndex: 'total', key: 'tot', align: 'right' as const, width: 120, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Paid', dataIndex: 'paid_amount', key: 'pd', align: 'right' as const, width: 110, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Balance', dataIndex: 'balance', key: 'bal', align: 'right' as const, width: 110, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'status', key: 's', width: 130, render: (s: PIStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 120, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/purchase-invoices/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/purchase-invoices/${r.id}/edit`)} />}
      </Space>
    )},
  ];
  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Purchase invoices</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={(Object.keys(COLORS) as PIStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchase-invoices/new')}>New PI</Button>
          </Space>
        </Space>
        <Table<PurchaseInvoice> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
