import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Space, Switch, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerContactApi } from '../api/partnerApi';
import type { PartnerContact, CreatePartnerContactPayload } from '../types/crm.types';
import { confirmDelete } from '../../common/confirmDelete';

export default function ContactsTab({ partnerId }: { partnerId: number }) {
  const [list, setList] = useState<PartnerContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PartnerContact | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreatePartnerContactPayload>();

  const fetchData = async () => {
    setLoading(true);
    try { setList(await partnerContactApi.list(partnerId)); }
    catch { message.error('Failed to load contacts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [partnerId]);

  const onAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (c: PartnerContact) => { setEditing(c); setTimeout(() => form.setFieldsValue(c), 0); setOpen(true); };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) await partnerContactApi.update(editing.id, v);
      else         await partnerContactApi.create(partnerId, v);
      message.success('Saved.');
      setOpen(false);
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onDelete = async (c: PartnerContact) => {
    try { await partnerContactApi.remove(c.id); message.success('Deleted.'); void fetchData(); }
    catch { message.error('Delete failed.'); }
  };

  const columns: ColumnsType<PartnerContact> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n, row) => (
      <Space><strong>{n}</strong>{row.is_primary && <Tag color="gold">primary</Tag>}</Space>
    )},
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Mobile', dataIndex: 'mobile', key: 'mobile' },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(row)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete contact "${row.name}"?`,
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', width: '100%' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>New contact</Button>
      </Space>

      <Table<PartnerContact> rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} size="small" />

      <Modal open={open} title={editing ? 'Edit contact' : 'New contact'} onCancel={() => setOpen(false)} onOk={onSave} okText="Save" width={600}>
        <Form<CreatePartnerContactPayload> form={form} layout="vertical" initialValues={{ is_active: true, is_primary: false }}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Designation" name="designation" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Department" name="department" style={{ flex: 1 }}><Input /></Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Email" name="email" rules={[{ type: 'email' }]} style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Phone" name="phone" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Mobile" name="mobile" style={{ flex: 1 }}><Input /></Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Primary" name="is_primary" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
            <Form.Item label="Active" name="is_active" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
          </Space.Compact>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
