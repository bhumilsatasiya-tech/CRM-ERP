import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { categoryApi } from '../api/productsApi';
import type { CreateCategoryPayload, ProductCategory } from '../types/products.types';
import { confirmDelete } from '../../common/confirmDelete';

export default function CategoriesPage() {
  const [list, setList] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreateCategoryPayload>();

  const fetchData = async () => {
    setLoading(true);
    try { setList(await categoryApi.list()); }
    catch { message.error('Failed to load categories.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); }, []);

  const onAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (c: ProductCategory) => {
    setEditing(c);
    setTimeout(() => form.setFieldsValue({
      parent_id: c.parent_id, code: c.code, name: c.name,
      description: c.description ?? undefined, sort_order: c.sort_order, is_active: c.is_active,
    }), 0);
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) await categoryApi.update(editing.id, v);
      else         await categoryApi.create(v);
      message.success('Saved.');
      setOpen(false); void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onDelete = async (c: ProductCategory) => {
    try { await categoryApi.remove(c.id); message.success('Deleted.'); void fetchData(); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<ProductCategory> = [
    {
      title: 'Name', key: 'name',
      render: (_, row) => (
        <Space>
          <span style={{ paddingLeft: row.depth * 18 }}>{row.depth > 0 ? '└─ ' : ''}<strong>{row.name}</strong></span>
          <Tag>{row.code}</Tag>
        </Space>
      ),
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Order', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(row)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete category ${row.code} — ${row.name}?`,
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
          <Typography.Title level={4} style={{ margin: 0 }}>Product categories</Typography.Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>New category</Button>
          </Space>
        </Space>

        <Table<ProductCategory> rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} size="middle" />
      </Space>

      <Modal open={open} title={editing ? 'Edit category' : 'New category'} onCancel={() => setOpen(false)} onOk={onSave} okText="Save" width={520}>
        <Form<CreateCategoryPayload> form={form} layout="vertical" initialValues={{ is_active: true, sort_order: 0 }}>
          <Form.Item label="Parent (optional)" name="parent_id">
            <Select
              allowClear showSearch optionFilterProp="label"
              options={list
                .filter((c) => !editing || c.id !== editing.id)
                .map((c) => ({ value: c.id, label: `${' '.repeat(c.depth * 2)}${c.code} — ${c.name}` }))
              }
            />
          </Form.Item>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Code (optional)" name="code" style={{ flex: 1 }} extra="auto-generated from name if blank"><Input placeholder="auto" /></Form.Item>
            <Form.Item label="Name" name="name" rules={[{ required: true }]} style={{ flex: 2 }}><Input /></Form.Item>
          </Space.Compact>
          <Form.Item label="Description" name="description"><Input.TextArea rows={2} /></Form.Item>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Sort order" name="sort_order" style={{ flex: 1 }}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Active" name="is_active" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </Card>
  );
}
