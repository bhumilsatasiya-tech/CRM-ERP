import { useEffect, useState } from 'react';
import {
  Button, Card, Input, Select, Space, Switch, Table, Tag, Typography, message,
} from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { userApi } from '../api/userApi';
import { roleApi } from '../api/roleApi';
import type { Role, User } from '../types/auth.types';

export default function UsersListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await userApi.list({
        search: search || undefined,
        role: roleFilter,
        is_active: activeFilter,
        page,
        per_page: perPage,
        sort: '-created_at',
      });
      setData(resp.data);
      setTotal(resp.meta.total);
    } catch {
      message.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    roleApi.list({ per_page: 100 }).then((r) => setRoles(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, roleFilter, activeFilter]);

  const handleDelete = async (id: number) => {
    try {
      await userApi.remove(id);
      message.success('User deleted.');
      void fetchData();
    } catch {
      message.error('Delete failed.');
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (rs?: string[]) => (rs ?? []).map((r) => <Tag key={r}>{r}</Tag>),
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => <Switch checked={v} disabled />,
    },
    {
      title: 'Last login',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (v?: string | null) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/users/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete user "${row.name}"?`,
              content: 'This is reversible (soft delete) — the user can be restored later.',
              onOk: () => handleDelete(row.id),
            })} />
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: perPage,
    total,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Users</Typography.Title>
          <Space wrap>
            <Input.Search
              placeholder="Search name, email, phone"
              allowClear
              onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }}
              style={{ width: 260 }}
            />
            <Select
              placeholder="Role"
              allowClear
              style={{ width: 160 }}
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setPage(1); }}
              options={roles.map((r) => ({ label: r.name, value: r.name }))}
            />
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 140 }}
              value={activeFilter}
              onChange={(v) => { setActiveFilter(v); setPage(1); }}
              options={[
                { label: 'Active', value: true },
                { label: 'Inactive', value: false },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/users/new')}>
              New user
            </Button>
          </Space>
        </Space>

        <Table<User>
          rowKey="id"
          dataSource={data}
          columns={columns}
          loading={loading}
          pagination={pagination}
          size="middle"
        />
      </Space>
    </Card>
  );
}
