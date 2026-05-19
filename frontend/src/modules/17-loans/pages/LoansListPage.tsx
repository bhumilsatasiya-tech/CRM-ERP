import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { loansApi } from '../api/loansApi';
import type { Loan, LoanStatus, LoanType } from '../types/loans.types';
import TableSkeleton from '../../common/TableSkeleton';

const COLORS: Record<LoanStatus, string> = { draft: 'default', active: 'blue', closed: 'green', cancelled: 'red' };

export default function LoansListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LoanStatus | undefined>(undefined);
  const [type, setType] = useState<LoanType | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await loansApi.list({ search: search || undefined, status, type, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status, type]);

  const cols: ColumnsType<Loan> = [
    { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/loans/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Type', dataIndex: 'type', width: 110, render: (t: LoanType) => <Tag color={t === 'borrowed' ? 'red' : 'green'}>{t}</Tag> },
    { title: 'Partner', key: 'p', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Principal', dataIndex: 'principal', align: 'right' as const, width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Outstanding', dataIndex: 'outstanding_principal', align: 'right' as const, width: 140, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'EMI', dataIndex: 'emi_amount', align: 'right' as const, width: 110, render: (v: number) => Number(v).toFixed(2) },
    { title: 'Tenure', dataIndex: 'tenure_months', width: 90, align: 'right' as const, render: (v: number) => `${v}m` },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: LoanStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: '', key: 'a', width: 60, render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/loans/${r.id}`)} /> },
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Loans</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Type" allowClear style={{ width: 130 }} value={type} onChange={(v) => { setType(v); setPage(1); }}
              options={(['borrowed', 'given'] as LoanType[]).map((t) => ({ value: t, label: t }))} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(['draft', 'active', 'closed', 'cancelled'] as LoanStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/loans/new')}>New loan</Button>
          </Space>
        </Space>
        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={6} />
          : <Table<Loan> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />}
      </Space>
    </Card>
  );
}
