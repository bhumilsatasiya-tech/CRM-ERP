import { useEffect, useState } from 'react';
import { Button, Card, Input, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { roleApi } from '../api/roleApi';
import type { Role } from '../types/auth.types';

export default function RolesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await roleApi.list({ search: search || undefined, page, per_page: perPage });
      setData(resp.data);
      setTotal(resp.meta.total);
    } catch {
      message.error('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  const handleDelete = async (row: Role) => {
    try {
      await roleApi.remove(row.id);
      message.success('Role deleted.');
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Role> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (n: string, row) => (
        <Space>
          <strong>{n}</strong>
          {row.is_system && <Tag color="blue">system</Tag>}
        </Space>
      ),
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (ps?: string[]) => <Tag>{(ps ?? []).length}</Tag>,
    },
    {
      title: 'Users',
      dataIndex: 'users_count',
      key: 'users_count',
      render: (c?: number) => c ?? 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/roles/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger disabled={row.is_system}
            onClick={() => confirmDelete({
              title: `Delete role "${row.name}"?`,
              content: row.is_system ? 'System roles cannot be deleted.' : 'Users assigned to this role will lose its permissions. Reassign them first.',
              onOk: () => handleDelete(row),
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
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Roles</Typography.Title>
          <Space>
            <Input.Search
              placeholder="Search role name"
              allowClear
              onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }}
              style={{ width: 240 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/roles/new')}>
              New role
            </Button>
          </Space>
        </Space>

        <Table<Role>
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
