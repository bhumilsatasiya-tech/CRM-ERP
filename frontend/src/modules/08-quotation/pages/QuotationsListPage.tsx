import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { quotationApi } from '../api/quotationApi';
import type { Quotation, QuotationStatus } from '../types/quotation.types';
import TableSkeleton from '../../common/TableSkeleton';

const COLORS: Record<QuotationStatus, string> = { draft: 'default', submitted: 'blue', approved: 'cyan', converted: 'green', expired: 'orange', cancelled: 'red' };

export default function QuotationsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0); const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<QuotationStatus | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try { const r = await quotationApi.list({ search: search || undefined, status, page, per_page: perPage }); setData(r.data); setTotal(r.meta.total); }
    catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<Quotation> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Date', dataIndex: 'quotation_date', key: 'd', width: 120 },
    { title: 'Client', key: 'p', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Reference', dataIndex: 'reference', key: 'ref' },
    { title: 'Total', dataIndex: 'total', key: 'tot', align: 'right' as const, width: 120, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'status', key: 's', width: 110, render: (s: QuotationStatus, r) => <Space><Tag color={COLORS[s]}>{s}</Tag>{r.converted_to_sales_order_id && <Tag color="purple">→ SO #{r.converted_to_sales_order_id}</Tag>}</Space> },
    { title: 'Lines', dataIndex: 'lines_count', key: 'lc', width: 70 },
    { title: 'Actions', key: 'a', width: 120, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/quotations/${r.id}`)} />
        {(r.status === 'draft' || r.status === 'submitted') && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/quotations/${r.id}/edit`)} />}
      </Space>
    )},
  ];
  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Quotations</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code or reference" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 240 }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={(Object.keys(COLORS) as QuotationStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/quotations/new')}>New quotation</Button>
          </Space>
        </Space>
        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={6} />
          : <Table<Quotation> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />}
      </Space>
    </Card>
  );
}
