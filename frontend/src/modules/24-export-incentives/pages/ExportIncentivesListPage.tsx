import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { exportIncentiveApi } from '../api/exportIncentivesApi';
import type { ExportIncentiveClaim, IncentiveStatus, IncentiveType } from '../types/exportIncentives.types';
import { confirmDelete } from '../../common/confirmDelete';

const TYPE_LABEL: Record<IncentiveType, string> = {
  drawback: 'Duty Drawback',
  igst_refund: 'IGST Refund',
  rodtep: 'RoDTEP',
};

const STATUS_COLOR: Record<IncentiveStatus, string> = {
  pending: 'default',
  filed: 'blue',
  approved: 'cyan',
  credited: 'green',
  rejected: 'red',
};

export default function ExportIncentivesListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ExportIncentiveClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<IncentiveType | undefined>();
  const [status, setStatus] = useState<IncentiveStatus | undefined>();
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [to, setTo] = useState<Dayjs | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await exportIncentiveApi.list({
        type, status,
        from: from?.format('YYYY-MM-DD'),
        to: to?.format('YYYY-MM-DD'),
        per_page: 100,
      });
      setRows(r.data);
    } catch { message.error('Failed to load claims.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [type, status, from, to]);

  const onDelete = async (id: number) => {
    try { await exportIncentiveApi.remove(id); message.success('Deleted.'); void fetchData(); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const cols: ColumnsType<ExportIncentiveClaim> = [
    { title: 'Type',     dataIndex: 'type',          width: 150, render: (t: IncentiveType) => <Tag color="blue">{TYPE_LABEL[t]}</Tag> },
    { title: 'Claim #',  dataIndex: 'claim_no',      width: 130, render: (c: string | null) => c ?? '—' },
    { title: 'Date',     dataIndex: 'claim_date',    width: 110 },
    { title: 'Shipping bill', dataIndex: 'shipping_bill', width: 150, render: (sb: { id: number; code: string } | null) => sb ? <Link to={`/shipping-bills/${sb.id}`}>{sb.code}</Link> : '—' },
    { title: 'Claim amount', dataIndex: 'claim_amount', align: 'right' as const, width: 130, render: (v: number, r) => `${r.claim_currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { title: 'Credited',  dataIndex: 'credited_amount', align: 'right' as const, width: 130, render: (v: number | null, r) => v != null ? `${r.claim_currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—' },
    { title: 'Status',   dataIndex: 'status',        width: 110, render: (s: IncentiveStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
    {
      title: 'Actions', key: 'a', width: 110,
      render: (_: unknown, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/export-incentives/${row.id}`)} />
          <Button danger size="small" icon={<DeleteOutlined />}
            onClick={() => confirmDelete({
              title: `Delete this ${row.type.replace('_', ' ')} claim?`,
              onOk: () => onDelete(row.id),
            })} />
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>Export Incentive Claims</Typography.Title>
          <Space wrap>
            <Select
              allowClear placeholder="Type" style={{ width: 160 }}
              value={type} onChange={(v) => setType(v as IncentiveType | undefined)}
              options={(['drawback', 'igst_refund', 'rodtep'] as IncentiveType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
            />
            <Select
              allowClear placeholder="Status" style={{ width: 140 }}
              value={status} onChange={(v) => setStatus(v as IncentiveStatus | undefined)}
              options={(['pending', 'filed', 'approved', 'credited', 'rejected'] as IncentiveStatus[]).map((s) => ({ value: s, label: s }))}
            />
            <DatePicker placeholder="From" value={from} onChange={setFrom} />
            <DatePicker placeholder="To"   value={to}   onChange={setTo} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/export-incentives/new')}>New claim</Button>
          </Space>
        </Space>
        <Table<ExportIncentiveClaim> rowKey="id" dataSource={rows} columns={cols} loading={loading} pagination={false} size="middle" />
      </Space>
    </Card>
  );
}
