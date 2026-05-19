import { useEffect, useState } from 'react';
import { Button, Form, InputNumber, Modal, Select, Space, Switch, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { unitApi, uomConversionApi } from '../api/productsApi';
import type { CreateUomConversionPayload, ProductUnit, ProductUomConversion } from '../types/products.types';
import { confirmDelete } from '../../common/confirmDelete';

export default function UomConversionsTab({ productId, baseUnitSymbol }: { productId: number; baseUnitSymbol?: string }) {
  const [list, setList] = useState<ProductUomConversion[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ProductUomConversion | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreateUomConversionPayload>();

  const fetchData = async () => {
    setLoading(true);
    try { setList(await uomConversionApi.list(productId)); }
    catch { message.error('Failed to load conversions.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { unitApi.list().then(setUnits).catch(() => undefined); void fetchData(); /* eslint-disable-next-line */ }, [productId]);

  const onAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (c: ProductUomConversion) => {
    setEditing(c);
    setTimeout(() => form.setFieldsValue({
      unit_id: c.unit_id, conversion_factor: c.conversion_factor,
      is_purchase_default: c.is_purchase_default, is_sales_default: c.is_sales_default,
      notes: c.notes ?? undefined, is_active: c.is_active,
    }), 0);
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) await uomConversionApi.update(editing.id, v);
      else         await uomConversionApi.create(productId, v);
      message.success('Saved.');
      setOpen(false); void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onDelete = async (c: ProductUomConversion) => {
    try { await uomConversionApi.remove(c.id); message.success('Deleted.'); void fetchData(); }
    catch { message.error('Delete failed.'); }
  };

  const columns: ColumnsType<ProductUomConversion> = [
    { title: 'Unit', key: 'unit',
      render: (_, row) => row.unit ? <Tag>{row.unit.symbol} ({row.unit.code})</Tag> : `Unit #${row.unit_id}` },
    {
      title: 'Conversion',
      key: 'factor',
      render: (_, row) => `1 × ${row.unit?.symbol ?? '?'} = ${row.conversion_factor} × ${baseUnitSymbol ?? 'base'}`,
    },
    { title: 'Purchase default', dataIndex: 'is_purchase_default', key: 'pd', render: (v: boolean) => v ? <Tag color="orange">PO default</Tag> : '—' },
    { title: 'Sales default', dataIndex: 'is_sales_default', key: 'sd', render: (v: boolean) => v ? <Tag color="blue">Sales default</Tag> : '—' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes' },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(row)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: 'Delete this UoM conversion?',
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', width: '100%' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>New conversion</Button>
      </Space>
      <Table<ProductUomConversion> rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} size="small" />
      <Modal open={open} title={editing ? 'Edit conversion' : 'New conversion'} onCancel={() => setOpen(false)} onOk={onSave} okText="Save" width={560}>
        <Form<CreateUomConversionPayload> form={form} layout="vertical" initialValues={{ is_active: true, conversion_factor: 1 }}>
          <Form.Item label="Alternate unit" name="unit_id" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={units.map((u) => ({ value: u.id, label: `${u.code} — ${u.name} (${u.symbol})` }))}
            />
          </Form.Item>
          <Form.Item
            label={`Conversion factor (1 × this unit = factor × ${baseUnitSymbol ?? 'base unit'})`}
            name="conversion_factor"
            rules={[{ required: true }]}
          >
            <InputNumber min={0.0000001} step={0.0001} style={{ width: '100%' }} />
          </Form.Item>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Purchase default" name="is_purchase_default" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
            <Form.Item label="Sales default" name="is_sales_default" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
            <Form.Item label="Active" name="is_active" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </>
  );
}
