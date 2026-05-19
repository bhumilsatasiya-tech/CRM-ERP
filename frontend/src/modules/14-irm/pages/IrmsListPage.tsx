import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { irmApi } from '../api/irmApi';
import type { Irm, IrmStatus, IrmPurpose } from '../types/irm.types';
import TableSkeleton from '../../common/TableSkeleton';

const COLORS: Record<IrmStatus, string> = {
  received: 'cyan', partially_allocated: 'gold', allocated: 'orange', closed: 'green', cancelled: 'red',
};
const PURPOSE_COLORS: Record<IrmPurpose, string> = { advance: 'purple', against_invoice: 'blue' };

export default function IrmsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Irm[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<IrmStatus | undefined>(undefined);
  const [purpose, setPurpose] = useState<IrmPurpose | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await irmApi.list({ search: search || undefined, status, purpose, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status, purpose]);

  const cols: ColumnsType<Irm> = [
    { title: 'Code / Bank ref', key: 'code', width: 200, render: (_, r) => (
      <Space direction="vertical" size={0}>
        <Link to={`/irms/${r.id}`}><Tag>{r.code}</Tag></Link>
        {r.bank_ref_no && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{r.bank_ref_no}</Typography.Text>}
      </Space>
    )},
    { title: 'Date', dataIndex: 'irm_date', key: 'd', width: 110 },
    { title: 'Purpose', dataIndex: 'purpose', key: 'pp', width: 130, render: (p: IrmPurpose) => <Tag color={PURPOSE_COLORS[p]}>{p === 'advance' ? 'Advance' : 'Against invoice'}</Tag> },
    { title: 'Remitter / Partner', key: 'rp', render: (_, r) => (
      <Space direction="vertical" size={0}>
        {r.partner ? <strong>{r.partner.name}</strong> : <Typography.Text type="secondary">—</Typography.Text>}
        {r.remitter_name && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{r.remitter_name}</Typography.Text>}
        {r.purchase_order_ref && <Typography.Text type="secondary" style={{ fontSize: 11 }}>PO: {r.purchase_order_ref}</Typography.Text>}
      </Space>
    )},
    { title: 'CCY', dataIndex: 'irm_currency', key: 'c', width: 70 },
    { title: 'Received', key: 'rec', align: 'right' as const, width: 130, render: (_, r) => Number(r.irm_amount_fcy).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    { title: 'Outstanding', key: 'out', align: 'right' as const, width: 130, render: (_, r) => {
      const out = Number(r.outstanding_amount_fcy);
      return <Typography.Text strong type={out > 0 ? 'warning' : 'secondary'}>{out.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography.Text>;
    }},
    { title: 'Available (INR)', key: 'avail_inr', align: 'right' as const, width: 130, render: (_, r) => `₹ ${Number(r.outstanding_amount_inr).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { title: 'Status', dataIndex: 'status', key: 's', width: 140, render: (s: IrmStatus) => <Tag color={COLORS[s]}>{s.replace('_', ' ')}</Tag> },
    { title: 'Actions', key: 'a', width: 80, render: (_, r) => <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/irms/${r.id}`)} /> },
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Inward remittances (IRM)</Typography.Title>
          <Space wrap>
            <Input.Search placeholder="Search code, bank ref, remitter" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 260 }} />
            <Select placeholder="Purpose" allowClear style={{ width: 160 }} value={purpose} onChange={(v) => { setPurpose(v); setPage(1); }}
              options={[{ value: 'advance', label: 'Advance' }, { value: 'against_invoice', label: 'Against invoice' }]} />
            <Select placeholder="Status" allowClear style={{ width: 180 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(COLORS) as IrmStatus[]).map((s) => ({ value: s, label: s.replace('_', ' ') }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/irms/new')}>New IRM</Button>
          </Space>
        </Space>
        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={7} />
          : <Table<Irm> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" scroll={{ x: 1400 }} />}
      </Space>
    </Card>
  );
}
