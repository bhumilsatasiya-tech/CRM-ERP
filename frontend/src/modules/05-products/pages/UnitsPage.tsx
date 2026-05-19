import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { unitApi } from '../api/productsApi';
import type { CreateUnitPayload, ProductUnit, UnitType } from '../types/products.types';
import { confirmDelete } from '../../common/confirmDelete';

const TYPE_COLORS: Record<UnitType, string> = {
  weight: 'orange', volume: 'blue', count: 'green', length: 'purple', area: 'cyan', time: 'magenta', other: 'default',
};

export default function UnitsPage() {
  const [list, setList] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ProductUnit | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<UnitType | undefined>(undefined);
  const [form] = Form.useForm<CreateUnitPayload>();

  const fetchData = async () => {
    setLoading(true);
    try { setList(await unitApi.list({ search: search || undefined, type })); }
    catch { message.error('Failed to load units.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [type]);

  const onAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (u: ProductUnit) => {
    setEditing(u);
    setTimeout(() => form.setFieldsValue(u as unknown as CreateUnitPayload), 0);
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) await unitApi.update(editing.id, v);
      else         await unitApi.create(v);
      message.success('Saved.');
      setOpen(false); void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onDelete = async (u: ProductUnit) => {
    try { await unitApi.remove(u.id); message.success('Deleted.'); void fetchData(); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<ProductUnit> = [
    { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 140 },
    { title: 'Formal name', dataIndex: 'formal_name', key: 'formal_name', render: (v?: string | null) => v || '—' },
    { title: 'UQC', dataIndex: 'uqc', key: 'uqc', width: 80, render: (v?: string | null) => v ? <Tag color="geekblue">{v}</Tag> : '—' },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 110, render: (t: UnitType) => <Tag color={TYPE_COLORS[t]}>{t}</Tag> },
    { title: 'Decimal places', dataIndex: 'decimals_allowed', key: 'decimals_allowed', width: 110, align: 'right' },
    { title: 'Base?', dataIndex: 'is_base', key: 'is_base', width: 80, render: (v: boolean) => v ? <Tag color="gold">base</Tag> : '—' },
    { title: 'Conv. factor', dataIndex: 'conversion_factor', key: 'conversion_factor', width: 120, align: 'right', render: (v: number) => v },
    { title: 'Code', dataIndex: 'code', key: 'code', width: 100, render: (v: string) => <Typography.Text type="secondary">{v}</Typography.Text> },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(row)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete unit ${row.symbol} — ${row.name}?`,
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
          <Typography.Title level={4} style={{ margin: 0 }}>Units of measure</Typography.Title>
          <Space wrap>
            <Input.Search placeholder="Search code, name, symbol" allowClear onSearch={(v) => { setSearch(v); void fetchData(); }} style={{ width: 240 }} />
            <Select placeholder="Type" allowClear style={{ width: 140 }} value={type} onChange={setType} options={[
              { value: 'weight', label: 'Weight' },
              { value: 'volume', label: 'Volume' },
              { value: 'count', label: 'Count' },
              { value: 'length', label: 'Length' },
              { value: 'area', label: 'Area' },
              { value: 'time', label: 'Time' },
              { value: 'other', label: 'Other' },
            ]} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>New unit</Button>
          </Space>
        </Space>

        <Table<ProductUnit> rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} size="middle" />
      </Space>

      <Modal open={open} title={editing ? 'Edit unit' : 'New unit'} onCancel={() => setOpen(false)} onOk={onSave} okText="Save" width={560}>
        <Form<CreateUnitPayload> form={form} layout="vertical" initialValues={{ type: 'count', is_base: false, conversion_factor: 1, decimals_allowed: 2, is_active: true }}>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Symbol" name="symbol" rules={[{ required: true }]} style={{ flex: 1 }} extra="e.g. kg, pcs"><Input placeholder="kg" /></Form.Item>
            <Form.Item label="UQC" name="uqc" style={{ flex: 1 }} extra="GST code, e.g. KGS"><Input placeholder="KGS" maxLength={8} /></Form.Item>
            <Form.Item label="Decimal places" name="decimals_allowed" style={{ flex: 1 }}><InputNumber min={0} max={8} style={{ width: '100%' }} /></Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Name (short)" name="name" rules={[{ required: true }]} style={{ flex: 1 }} extra="e.g. Kilogram"><Input /></Form.Item>
            <Form.Item label="Formal name" name="formal_name" style={{ flex: 1 }} extra="full descriptive"><Input placeholder="Kilogram (mass)" /></Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Code (optional)" name="code" style={{ flex: 1 }} extra="auto-generated from symbol if blank"><Input placeholder="auto" disabled={!!editing} /></Form.Item>
            <Form.Item label="Type" name="type" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[
                { value: 'weight', label: 'Weight' },
                { value: 'volume', label: 'Volume' },
                { value: 'count', label: 'Count' },
                { value: 'length', label: 'Length' },
                { value: 'area', label: 'Area' },
                { value: 'time', label: 'Time' },
                { value: 'other', label: 'Other' },
              ]} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Is base unit" name="is_base" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
            <Form.Item label="Conversion factor (× to base)" name="conversion_factor" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0.0000001} step={0.0001} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Active" name="is_active" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </Card>
  );
}
