import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { companyApi } from '../api/companyApi';
import type { Company, CompanyType } from '../types/companies.types';
import { confirmDelete } from '../../common/confirmDelete';

export default function CompaniesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<CompanyType | undefined>(undefined);
  const [active, setActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await companyApi.list({ search: search || undefined, type, is_active: active, page, per_page: perPage });
      setData(r.data);
      setTotal(r.meta.total);
    } catch {
      message.error('Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, type, active]);

  const onDelete = async (row: Company) => {
    try {
      await companyApi.remove(row.id);
      message.success('Company deleted.');
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Company> = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n, row) => <strong>{n}</strong> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t: CompanyType) => (
      <Tag color={t === 'export' ? 'blue' : t === 'supplying' ? 'purple' : 'default'}>{t}</Tag>
    )},
    { title: 'GST', dataIndex: 'gst_no', key: 'gst_no' },
    { title: 'Branches', dataIndex: 'branches_count', key: 'branches_count', render: (c?: number) => c ?? 0 },
    { title: 'Warehouses', dataIndex: 'warehouses_count', key: 'warehouses_count', render: (c?: number) => c ?? 0 },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/companies/${row.id}/branches`)}>Branches</Button>
          <Button size="small" onClick={() => navigate(`/companies/${row.id}/warehouses`)}>Warehouses</Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/companies/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete company ${row.code}?`,
              content: 'This will also remove its branches and warehouses. Codes become available for reuse.',
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: perPage, total, showSizeChanger: true,
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Companies</Typography.Title>
          <Space wrap>
            <Input.Search
              placeholder="Search code, name, GST"
              allowClear
              onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }}
              style={{ width: 260 }}
            />
            <Select
              placeholder="Type"
              allowClear
              style={{ width: 140 }}
              value={type}
              onChange={(v) => { setType(v); setPage(1); }}
              options={[
                { label: 'Export', value: 'export' },
                { label: 'Supplying', value: 'supplying' },
                { label: 'Trading', value: 'trading' },
                { label: 'Other', value: 'other' },
              ]}
            />
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 140 }}
              value={active}
              onChange={(v) => { setActive(v); setPage(1); }}
              options={[{ label: 'Active', value: true }, { label: 'Inactive', value: false }]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/companies/new')}>
              New company
            </Button>
          </Space>
        </Space>
        <Table<Company>
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
