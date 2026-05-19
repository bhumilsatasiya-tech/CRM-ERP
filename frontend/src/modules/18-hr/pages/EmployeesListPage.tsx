import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { employeeApi } from '../api/hrApi';
import type { Employee, EmployeeStatus } from '../types/hr.types';

const COLORS: Record<EmployeeStatus, string> = { active: 'green', inactive: 'orange', resigned: 'red', terminated: 'red' };

export default function EmployeesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmployeeStatus | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await employeeApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<Employee> = [
    { title: 'Code', dataIndex: 'code', width: 120, render: (c: string, r) => <Link to={`/employees/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Phone', dataIndex: 'phone', width: 120 },
    { title: 'Designation', key: 'd', width: 160, render: (_, r) => r.designation?.name ?? '—' },
    { title: 'Joining', dataIndex: 'joining_date', width: 110 },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: EmployeeStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 110, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/employees/${r.id}`)} />
        <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/employees/${r.id}/edit`)} />
      </Space>
    )},
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Employees</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code/name/email" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 240 }} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(['active', 'inactive', 'resigned', 'terminated'] as EmployeeStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/employees/new')}>New employee</Button>
          </Space>
        </Space>
        <Table<Employee> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
