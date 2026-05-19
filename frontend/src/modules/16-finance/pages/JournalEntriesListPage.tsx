import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { journalApi } from '../api/financeApi';
import type { JournalEntry, JournalStatus } from '../types/finance.types';

const COLORS: Record<JournalStatus, string> = { draft: 'default', posted: 'green', cancelled: 'red' };

export default function JournalEntriesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JournalStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await journalApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<JournalEntry> = [
    { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/journal-entries/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Date', dataIndex: 'entry_date', width: 110 },
    { title: 'Source', key: 'src', width: 160, render: (_, r) => r.reference_type ? <Tag color="cyan">{r.reference_type.split('\\').pop()}</Tag> : <Tag>manual</Tag> },
    { title: 'Narration', dataIndex: 'narration', ellipsis: true },
    { title: 'Debit', dataIndex: 'total_debit', align: 'right' as const, width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Credit', dataIndex: 'total_credit', align: 'right' as const, width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: JournalStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: '', key: 'a', width: 60, render: (_, r) => <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/journal-entries/${r.id}`)} /> },
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Journal entries</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(['draft', 'posted', 'cancelled'] as JournalStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/journal-entries/new')}>New entry</Button>
          </Space>
        </Space>
        <Table<JournalEntry> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
