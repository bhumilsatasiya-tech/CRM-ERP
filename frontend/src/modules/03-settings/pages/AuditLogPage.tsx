import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Drawer, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { auditLogApi } from '../api/settingsApi';
import type { AuditLog } from '../types/settings.types';

const EVENT_COLORS: Record<string, string> = {
  created: 'green', updated: 'blue', deleted: 'red', restored: 'geekblue',
};

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [event, setEvent] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [drawer, setDrawer] = useState<AuditLog | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await auditLogApi.list({
        page, per_page: perPage,
        event,
        search: search || undefined,
        from: range?.[0]?.format('YYYY-MM-DD'),
        to:   range?.[1]?.format('YYYY-MM-DD'),
      });
      setData(r.data);
      setTotal(r.meta.total);
    } catch { message.error('Failed to load audit log.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, event, range]);

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'When',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '—',
    },
    {
      title: 'Event',
      dataIndex: 'event',
      key: 'event',
      width: 110,
      render: (e?: string | null) => e ? <Tag color={EVENT_COLORS[e] ?? 'default'}>{e}</Tag> : '—',
    },
    { title: 'Log', dataIndex: 'log_name', key: 'log_name', width: 120 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Subject',
      key: 'subject',
      render: (_, row) => row.subject_type ? (
        <span><code>{row.subject_type.split('\\').pop()}</code> #{row.subject_id}</span>
      ) : '—',
    },
    {
      title: 'By',
      key: 'causer',
      render: (_, row) => row.causer ? row.causer.name : '—',
    },
    {
      title: '',
      key: 'view',
      width: 80,
      render: (_, row) => <Button size="small" onClick={() => setDrawer(row)}>View</Button>,
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: perPage, total,
    showSizeChanger: true, pageSizeOptions: [25, 50, 100],
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Audit log</Typography.Title>
          <Space wrap>
            <Input.Search placeholder="Search description / log name" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }} style={{ width: 280 }} />
            <Select
              placeholder="Event"
              allowClear
              value={event}
              onChange={(v) => { setEvent(v); setPage(1); }}
              style={{ width: 140 }}
              options={[
                { value: 'created', label: 'created' },
                { value: 'updated', label: 'updated' },
                { value: 'deleted', label: 'deleted' },
                { value: 'restored', label: 'restored' },
              ]}
            />
            <DatePicker.RangePicker value={range as [Dayjs | null, Dayjs | null]} onChange={(v) => { setRange(v as [Dayjs | null, Dayjs | null]); setPage(1); }} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
          </Space>
        </Space>

        <Table<AuditLog> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={pagination} size="middle" />
      </Space>

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer ? `${drawer.event ?? 'event'} on ${drawer.subject_type?.split('\\').pop() ?? '—'} #${drawer.subject_id ?? '—'}` : ''}
        width={640}
      >
        {drawer && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text type="secondary">{drawer.created_at && dayjs(drawer.created_at).format('YYYY-MM-DD HH:mm:ss')}</Typography.Text>
            <div><strong>By:</strong> {drawer.causer ? `${drawer.causer.name} (${drawer.causer.email})` : '—'}</div>
            <div><strong>Description:</strong> {drawer.description}</div>
            <div>
              <strong>Properties:</strong>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
                {JSON.stringify(drawer.properties ?? {}, null, 2)}
              </pre>
            </div>
          </Space>
        )}
      </Drawer>
    </Card>
  );
}
