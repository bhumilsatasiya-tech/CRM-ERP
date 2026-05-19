import { useEffect, useState } from 'react';
import { Button, Card, Input, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { branchApi } from '../api/branchApi';
import type { Branch } from '../types/companies.types';
import { confirmDelete } from '../../common/confirmDelete';

export default function BranchesListPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const r = await branchApi.list(Number(companyId), { search: search || undefined, per_page: 100 });
      setData(r.data);
    } catch {
      message.error('Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [companyId]);

  const onDelete = async (row: Branch) => {
    try {
      await branchApi.remove(row.id);
      message.success('Branch deleted.');
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Branch> = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string, row) => (
      <Space><strong>{n}</strong>{row.is_head_office && <Tag color="gold">head office</Tag>}</Space>
    ) },
    { title: 'City', dataIndex: ['address', 'city'], key: 'city' },
    { title: 'State', dataIndex: ['address', 'state'], key: 'state' },
    { title: 'GST', dataIndex: 'gst_no', key: 'gst_no' },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/companies/${companyId}/branches/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete branch ${row.code}?`,
              content: 'Its warehouses will also be removed. Codes become available for reuse.',
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Link to="/companies"><Button>← Companies</Button></Link>
            <Typography.Title level={4} style={{ margin: 0 }}>Branches</Typography.Title>
          </Space>
          <Space>
            <Input.Search
              placeholder="Search branch code or name"
              allowClear
              onSearch={(v) => { setSearch(v); void fetchData(); }}
              style={{ width: 240 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/companies/${companyId}/branches/new`)}>
              New branch
            </Button>
          </Space>
        </Space>
        <Table<Branch> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={false} size="middle" />
      </Space>
    </Card>
  );
}
