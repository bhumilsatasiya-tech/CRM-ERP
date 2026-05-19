import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { lodgementApi } from '../api/lodgementApi';
import type { Lodgement, LodgementStatus } from '../types/lodgement.types';

const COLORS: Record<LodgementStatus, string> = {
  draft: 'default', submitted: 'cyan', accepted: 'green', rejected: 'red', cancelled: 'red',
};

export default function ExportLodgementsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Lodgement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LodgementStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await lodgementApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<Lodgement> = [
    { title: 'Lodgement', dataIndex: 'code', key: 'code', width: 180, render: (c: string, r) => <Link to={`/export-lodgement/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Date', dataIndex: 'lodgement_date', key: 'd', width: 110 },
    { title: 'Client', key: 'p', render: (_, r) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: 'Bank receipt no.', dataIndex: 'bank_receipt_no', key: 'br', width: 160 },
    { title: 'Receipt date', dataIndex: 'bank_receipt_date', key: 'brd', width: 120 },
    { title: 'Rows', dataIndex: 'allocations_count', key: 'ac', align: 'right', width: 70 },
    { title: 'Status', dataIndex: 'status', key: 's', width: 130, render: (s: LodgementStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 80, render: (_, r) => <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/export-lodgement/${r.id}`)} /> },
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Export Lodgements</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code, bank receipt" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 280 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(COLORS) as LodgementStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/export-lodgement/new')}>New lodgement</Button>
          </Space>
        </Space>
        <Table<Lodgement> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
