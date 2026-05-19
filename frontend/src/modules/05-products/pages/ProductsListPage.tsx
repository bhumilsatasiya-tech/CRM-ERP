import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { categoryApi, productApi } from '../api/productsApi';
import type { Product, ProductCategory, ProductType } from '../types/products.types';
import { confirmDelete } from '../../common/confirmDelete';
import TableSkeleton from '../../common/TableSkeleton';

const TYPE_COLORS: Record<ProductType, string> = {
  raw: 'purple', finished: 'blue', packaging: 'orange', consumable: 'cyan', service: 'magenta', other: 'default',
};

export default function ProductsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ProductType | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [active, setActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await productApi.list({ search: search || undefined, type, category_id: categoryId, is_active: active, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed to load products.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { categoryApi.list().then(setCategories).catch(() => undefined); }, []);
  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, type, categoryId, active]);

  const onDelete = async (row: Product) => {
    try { await productApi.remove(row.id); message.success('Deleted.'); void fetchData(); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Product> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 130, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name',
      render: (n: string, row) => (
        <Space direction="vertical" size={0}>
          <strong>{n}</strong>
          {row.barcode && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{row.barcode}</Typography.Text>}
        </Space>
      ),
    },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 110, render: (t: ProductType) => <Tag color={TYPE_COLORS[t]}>{t}</Tag> },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'category', width: 140 },
    { title: 'UoM', dataIndex: ['unit', 'symbol'], key: 'unit', width: 70 },
    { title: 'HSN', dataIndex: 'hsn_code', key: 'hsn_code', width: 110 },
    { title: 'Tax %', dataIndex: 'tax_rate', key: 'tax_rate', width: 80, render: (v: number) => `${v.toFixed(2)}%` },
    { title: 'Cost', dataIndex: 'standard_cost', key: 'standard_cost', width: 110, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) },
    { title: 'Price', dataIndex: 'standard_price', key: 'standard_price', width: 110, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions', key: 'actions', width: 100, fixed: 'right' as const,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/products/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete product ${row.code} — ${row.name}?`,
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
          <Typography.Title level={4} style={{ margin: 0 }}>Products</Typography.Title>
          <Space wrap>
            <Input.Search placeholder="Search code, name, barcode, HSN..." allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }} style={{ width: 280 }} />
            <Select placeholder="Type" allowClear style={{ width: 140 }} value={type} onChange={(v) => { setType(v); setPage(1); }} options={[
              { value: 'raw', label: 'Raw material' },
              { value: 'finished', label: 'Finished' },
              { value: 'packaging', label: 'Packaging' },
              { value: 'consumable', label: 'Consumable' },
              { value: 'service', label: 'Service' },
              { value: 'other', label: 'Other' },
            ]} />
            <Select
              placeholder="Category" allowClear style={{ width: 180 }}
              value={categoryId} onChange={(v) => { setCategoryId(v); setPage(1); }}
              options={categories.map((c) => ({ value: c.id, label: `${' '.repeat(c.depth * 2)}${c.code} — ${c.name}` }))}
            />
            <Select placeholder="Status" allowClear style={{ width: 130 }} value={active} onChange={(v) => { setActive(v); setPage(1); }} options={[
              { value: true, label: 'Active' }, { value: false, label: 'Inactive' },
            ]} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>New product</Button>
          </Space>
        </Space>
        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={7} onRetry={() => void fetchData()} />
          : <Table<Product> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={pagination} size="middle" scroll={{ x: 1500 }} />}
      </Space>
    </Card>
  );
}
