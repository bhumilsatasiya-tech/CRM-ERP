import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { interCompanyApi } from '../api/interCompanyApi';
import type { IciStatus, InterCompanyInvoice } from '../types/intercompany.types';

const COLORS: Record<IciStatus, string> = { draft: 'default', posted: 'green', cancelled: 'red' };

export default function InterCompanyInvoicesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<InterCompanyInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<IciStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await interCompanyApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<InterCompanyInvoice> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 180, render: (c: string, r) => <Link to={`/inter-company-invoices/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Date', dataIndex: 'invoice_date', key: 'd', width: 110 },
    { title: 'From → To', key: 'ft', render: (_, r) => `${r.from_company?.code ?? '?'} → ${r.to_company?.code ?? '?'}` },
    { title: 'Profit %', dataIndex: 'profit_pct', key: 'pp', align: 'right' as const, width: 90, render: (v: number) => Number(v).toFixed(2) },
    { title: 'Cost basis', dataIndex: 'cost_basis', key: 'cb', align: 'right' as const, width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Total', dataIndex: 'total', key: 't', align: 'right' as const, width: 130, render: (v: number, r) => `${r.currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { title: 'Status', dataIndex: 'status', key: 's', width: 110, render: (s: IciStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 110, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/inter-company-invoices/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/inter-company-invoices/${r.id}/edit`)} />}
      </Space>
    )},
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Inter-company invoices</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(COLORS) as IciStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inter-company-invoices/new')}>New ICI</Button>
          </Space>
        </Space>
        <Table<InterCompanyInvoice> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
