import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, FileTextOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { partnerApi } from '../api/partnerApi';
import type { Partner, PartnerType, Segment } from '../types/crm.types';
import { confirmDelete } from '../../common/confirmDelete';
import TableSkeleton from '../../common/TableSkeleton';

const TYPE_COLORS: Record<PartnerType, string> = {
  client: 'blue', supplier: 'orange', vendor: 'gold', manufacturer: 'purple', importer: 'cyan', employee: 'green', logistic: 'magenta', other: 'default',
};

const NEW_LABEL: Record<PartnerType, string> = {
  client: 'Client (Buyer)',
  supplier: 'Supplier (Seller)',
  logistic: 'Logistic Company',
  vendor: 'Vendor (Service provider)',
  manufacturer: 'Manufacturer',
  importer: 'Importer',
  employee: 'Employee',
  other: 'Partner',
};
const LIST_TITLE: Record<PartnerType, string> = {
  client: 'Clients (Buyers)',
  supplier: 'Suppliers (Sellers)',
  logistic: 'Logistic Companies',
  vendor: 'Vendors (Service providers)',
  manufacturer: 'Manufacturers',
  importer: 'Importers',
  employee: 'Employees',
  other: 'Other partners',
};

const PARTNER_TYPES: PartnerType[] = ['client', 'supplier', 'logistic', 'vendor', 'manufacturer', 'importer', 'employee', 'other'];

function isValidType(v: string | null): v is PartnerType {
  return v != null && (PARTNER_TYPES as string[]).includes(v);
}

export default function PartnersListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlType = params.get('type');
  const initialType: PartnerType | undefined = isValidType(urlType) ? urlType : undefined;

  const [data, setData] = useState<Partner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<PartnerType | undefined>(initialType);
  const [segment, setSegment] = useState<Segment | undefined>(undefined);
  const [active, setActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Re-sync filter state when the URL ?type= changes (e.g. sidebar nav between Suppliers and Clients)
  useEffect(() => {
    const t = params.get('type');
    setType(isValidType(t) ? t : undefined);
    setPage(1);
  }, [params]);

  // Reflect manual filter changes back into the URL
  const onTypeChange = (v: PartnerType | undefined) => {
    setType(v);
    const next = new URLSearchParams(params);
    if (v) next.set('type', v); else next.delete('type');
    setParams(next, { replace: true });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await partnerApi.list({
        search: search || undefined, type, segment, is_active: active,
        page, per_page: perPage,
      });
      setData(r.data);
      setTotal(r.meta.total);
    } catch { message.error('Failed to load partners.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, type, segment, active]);

  const onDelete = async (row: Partner) => {
    try {
      await partnerApi.remove(row.id);
      message.success('Partner deleted.');
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Partner> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 110, render: (c: string) => <Tag>{c}</Tag> },
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (n: string, row) => (
        <Space>
          <strong>{n}</strong>
          {row.is_blacklisted && <Tag color="red">blacklisted</Tag>}
          {!row.is_active && <Tag>inactive</Tag>}
        </Space>
      ),
    },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 130, render: (t: PartnerType) => <Tag color={TYPE_COLORS[t]}>{t}</Tag> },
    { title: 'Country', dataIndex: 'country', key: 'country', width: 90, render: (c?: string) => c ? <Tag color={c === 'IN' ? 'green' : 'blue'}>{c}</Tag> : '—' },
    { title: 'Segment', dataIndex: 'segment', key: 'segment', width: 110 },
    { title: 'GST', dataIndex: 'gst_no', key: 'gst_no', width: 160 },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 90 },
    { title: 'Credit limit', dataIndex: 'credit_limit', key: 'credit_limit', width: 120, render: (v: number) => v ? v.toLocaleString() : '—' },
    { title: 'Contacts', dataIndex: 'contacts_count', key: 'contacts_count', width: 90, render: (c?: number) => c ?? 0 },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, row) => (
        <Space>
          <Button icon={<FileTextOutlined />} size="small" title="View statement"
            onClick={() => navigate(`/partners/${row.id}/statement`)} />
          <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/partners/${row.id}/edit`)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete ${NEW_LABEL[row.type]?.toLowerCase() ?? 'partner'} ${row.code} — ${row.name}?`,
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
          <Typography.Title level={4} style={{ margin: 0 }}>
            {type ? LIST_TITLE[type] : 'Partners'}
          </Typography.Title>
          <Space wrap>
            <Input.Search
              placeholder="Search code, name, GST, phone..."
              allowClear
              onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }}
              style={{ width: 280 }}
            />
            <Select
              placeholder="Type" allowClear style={{ width: 150 }}
              value={type} onChange={(v) => { onTypeChange(v); setPage(1); }}
              options={PARTNER_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            />
            <Select
              placeholder="Segment" allowClear style={{ width: 140 }}
              value={segment} onChange={(v) => { setSegment(v); setPage(1); }}
              options={[
                { value: 'b2b', label: 'B2B' },
                { value: 'b2c', label: 'B2C' },
                { value: 'distributor', label: 'Distributor' },
                { value: 'oem', label: 'OEM' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Select
              placeholder="Status" allowClear style={{ width: 130 }}
              value={active} onChange={(v) => { setActive(v); setPage(1); }}
              options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/partners/new${type ? `?type=${type}` : ''}`)}>
              New {NEW_LABEL[type ?? 'other']}
            </Button>
          </Space>
        </Space>

        {loading && data.length === 0
          ? <TableSkeleton rows={8} columns={6} />
          : <Table<Partner> rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={pagination} size="middle" scroll={{ x: 1300 }} />}
      </Space>
    </Card>
  );
}
