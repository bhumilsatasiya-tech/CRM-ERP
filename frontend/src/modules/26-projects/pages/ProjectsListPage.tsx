import { useEffect, useState } from 'react';
import { Button, Card, Input, Progress, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { projectsApi } from '../api/projectsApi';
import type { Project, ProjectStatus } from '../types/projects.types';
import { confirmDelete } from '../../common/confirmDelete';
import TableSkeleton from '../../common/TableSkeleton';

const STATUS_COLOR: Record<ProjectStatus, string> = {
  planning:  'default',
  active:    'blue',
  completed: 'green',
  cancelled: 'red',
};

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await projectsApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data);
      setTotal(r.meta.total);
    } catch { message.error('Failed to load projects.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const onDelete = async (row: Project) => {
    try { await projectsApi.remove(row.id); message.success('Deleted.'); void fetchData(); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Project> = [
    { title: 'Code',   dataIndex: 'code', width: 130, render: (c: string) => <strong>{c}</strong> },
    { title: 'Project name', dataIndex: 'name', render: (n: string, row) => (
      <Space direction="vertical" size={0}>
        <span><strong>{n}</strong></span>
        {row.target_product && <Typography.Text type="secondary" style={{ fontSize: 11 }}>Product: {row.target_product.code} — {row.target_product.name}</Typography.Text>}
      </Space>
    )},
    { title: 'Target qty', dataIndex: 'target_qty', width: 110, align: 'right' as const, render: (v: number, row) => v ? `${Number(v).toLocaleString()} ${row.unit ?? ''}` : '—' },
    { title: 'Planned', dataIndex: 'planned_total', width: 130, align: 'right' as const, render: (v: number) => `₹ ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { title: 'Actual', dataIndex: 'actual_total', width: 130, align: 'right' as const, render: (v: number) => <strong>₹ {Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> },
    { title: 'Variance', key: 'variance', width: 130, align: 'right' as const, render: (_: unknown, row) => {
      const variance = Number(row.actual_total) - Number(row.planned_total);
      const pct = row.planned_total > 0 ? (variance / Number(row.planned_total)) * 100 : 0;
      return <span style={{ color: variance >= 0 ? '#cf1322' : '#3f8600' }}>
        {variance >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>;
    }},
    { title: 'Cost / unit', key: 'cpu', width: 120, align: 'right' as const, render: (_: unknown, row) => {
      if (row.target_qty <= 0) return '—';
      return `₹ ${(Number(row.actual_total) / Number(row.target_qty)).toFixed(2)}`;
    }},
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: ProjectStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
    { title: 'Entries', dataIndex: 'entries_count', width: 80, align: 'right' as const, render: (c?: number) => c ?? 0 },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/projects/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({ title: `Delete project ${row.code} — ${row.name}?`, onOk: () => onDelete(row) })} />
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: perPage, total, showSizeChanger: true,
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  // Quick summary of total committed across all projects (planned + actual)
  const grandPlanned = data.reduce((s, p) => s + Number(p.planned_total ?? 0), 0);
  const grandActual = data.reduce((s, p) => s + Number(p.actual_total ?? 0), 0);

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Project costing</Typography.Title>
          <Space wrap>
            <Input.Search placeholder="Search code or name..." allowClear style={{ width: 260 }}
              onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'planning',  label: 'Planning' },
                { value: 'active',    label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>New project</Button>
          </Space>
        </Space>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Standalone cost study — manual entry of raw material, conversion, packaging, labour, transport, utilities and
          overhead. Aggregated totals on this page; per-project breakdown inside.
        </Typography.Text>

        {/* Page-level totals */}
        {data.length > 0 && (
          <Card size="small" style={{ background: '#fafafa' }}>
            <Space size="large" wrap>
              <span><Typography.Text type="secondary">Planned (page):</Typography.Text> <strong>₹ {grandPlanned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              <span><Typography.Text type="secondary">Actual (page):</Typography.Text> <strong>₹ {grandActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              {grandPlanned > 0 && (
                <span style={{ minWidth: 200 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>Actual vs planned</Typography.Text>
                  <Progress percent={Math.min(100, Math.round((grandActual / grandPlanned) * 100))} size="small" />
                </span>
              )}
            </Space>
          </Card>
        )}

        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={9} onRetry={() => void fetchData()} />
          : <Table<Project> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={pagination} size="middle" scroll={{ x: 1300 }} />}
      </Space>
    </Card>
  );
}
