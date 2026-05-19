import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { warehouseApi } from '../api/warehouseApi';
import type { Warehouse, WarehouseType } from '../types/companies.types';
import { confirmDelete } from '../../common/confirmDelete';

export default function WarehousesListPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<WarehouseType | undefined>(undefined);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const r = await warehouseApi.list(Number(companyId), { search: search || undefined, type, per_page: 100 });
      setData(r.data);
    } catch {
      message.error('Failed to load warehouses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [companyId, type]);

  const onDelete = async (row: Warehouse) => {
    try {
      await warehouseApi.remove(row.id);
      message.success('Warehouse deleted.');
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Warehouse> = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string, row) => (
      <Space><strong>{n}</strong>{row.is_default && <Tag color="green">default</Tag>}</Space>
    )},
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t: WarehouseType) => <Tag>{t}</Tag> },
    { title: 'Branch', dataIndex: ['branch', 'name'], key: 'branch' },
    { title: 'City', dataIndex: ['address', 'city'], key: 'city' },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/companies/${companyId}/warehouses/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete warehouse ${row.code}?`,
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
            <Typography.Title level={4} style={{ margin: 0 }}>Warehouses</Typography.Title>
          </Space>
          <Space>
            <Input.Search placeholder="Search code or name" allowClear onSearch={(v) => { setSearch(v); void fetchData(); }} style={{ width: 240 }} />
            <Select
              placeholder="Type" allowClear style={{ width: 160 }}
              value={type} onChange={(v) => setType(v)}
              options={[
                { label: 'Finished', value: 'finished' },
                { label: 'Raw', value: 'raw' },
                { label: 'Packaging', value: 'packaging' },
                { label: 'Quarantine', value: 'quarantine' },
                { label: 'Transit', value: 'transit' },
                { label: 'Reject', value: 'reject' },
                { label: 'Other', value: 'other' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/companies/${companyId}/warehouses/new`)}>
              New warehouse
            </Button>
          </Space>
        </Space>
        <Table<Warehouse> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={false} size="middle" />
      </Space>
    </Card>
  );
}
