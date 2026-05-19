import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Switch, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerAddressApi } from '../api/partnerApi';
import type { PartnerAddress, CreatePartnerAddressPayload, AddressType } from '../types/crm.types';
import { confirmDelete } from '../../common/confirmDelete';

const TYPE_COLORS: Record<AddressType, string> = {
  billing: 'blue', shipping: 'green', registered: 'purple', branch: 'orange',
};

export default function AddressesTab({ partnerId }: { partnerId: number }) {
  const [list, setList] = useState<PartnerAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PartnerAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreatePartnerAddressPayload>();

  const fetchData = async () => {
    setLoading(true);
    try { setList(await partnerAddressApi.list(partnerId)); }
    catch { message.error('Failed to load addresses.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [partnerId]);

  const onAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (a: PartnerAddress) => { setEditing(a); setTimeout(() => form.setFieldsValue(a), 0); setOpen(true); };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) await partnerAddressApi.update(editing.id, v);
      else         await partnerAddressApi.create(partnerId, v);
      message.success('Saved.');
      setOpen(false); void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onDelete = async (a: PartnerAddress) => {
    try { await partnerAddressApi.remove(a.id); message.success('Deleted.'); void fetchData(); }
    catch { message.error('Delete failed.'); }
  };

  const columns: ColumnsType<PartnerAddress> = [
    { title: 'Type', dataIndex: 'type', key: 'type', width: 110, render: (t: AddressType) => <Tag color={TYPE_COLORS[t]}>{t}</Tag> },
    { title: 'Label', dataIndex: 'label', key: 'label', width: 120 },
    { title: 'Address', key: 'address',
      render: (_, row) => (
        <span>
          {row.line1}{row.line2 ? `, ${row.line2}` : ''}{row.city ? `, ${row.city}` : ''}
          {row.state ? `, ${row.state}` : ''}{row.postal_code ? ` — ${row.postal_code}` : ''}
        </span>
      ),
    },
    { title: 'GST @ addr.', dataIndex: 'gst_no_at_address', key: 'gst', width: 160 },
    { title: 'Primary', dataIndex: 'is_primary', key: 'is_primary', width: 90, render: (v: boolean) => v ? <Tag color="gold">primary</Tag> : '—' },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(row)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete this ${row.type} address?`,
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', width: '100%' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>New address</Button>
      </Space>

      <Table<PartnerAddress> rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} size="small" />

      <Modal open={open} title={editing ? 'Edit address' : 'New address'} onCancel={() => setOpen(false)} onOk={onSave} okText="Save" width={680}>
        <Form<CreatePartnerAddressPayload>
          form={form} layout="vertical"
          initialValues={{ is_active: true, is_primary: false, type: 'billing', country: 'India' }}
        >
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Type" name="type" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[
                { value: 'billing', label: 'Billing' },
                { value: 'shipping', label: 'Shipping' },
                { value: 'registered', label: 'Registered' },
                { value: 'branch', label: 'Branch' },
              ]} />
            </Form.Item>
            <Form.Item label="Label (optional)" name="label" style={{ flex: 2 }}><Input placeholder="e.g. Mumbai HQ" /></Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Contact name" name="contact_name" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Phone" name="phone" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Email" name="email" rules={[{ type: 'email' }]} style={{ flex: 1 }}><Input /></Form.Item>
          </Space.Compact>
          <Form.Item label="Line 1" name="line1" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Line 2" name="line2"><Input /></Form.Item>
          <Form.Item label="Landmark" name="landmark"><Input /></Form.Item>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="City" name="city" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="State" name="state" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Country" name="country" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Postal code" name="postal_code" style={{ flex: 1 }}><Input /></Form.Item>
          </Space.Compact>
          <Form.Item label="GST at this address" name="gst_no_at_address"><Input /></Form.Item>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Primary" name="is_primary" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
            <Form.Item label="Active" name="is_active" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </>
  );
}
