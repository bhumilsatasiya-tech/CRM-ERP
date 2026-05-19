import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Switch, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerBankApi } from '../api/partnerApi';
import type { PartnerBankAccount, CreatePartnerBankPayload } from '../types/crm.types';
import { confirmDelete } from '../../common/confirmDelete';

export default function BankAccountsTab({ partnerId }: { partnerId: number }) {
  const [list, setList] = useState<PartnerBankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PartnerBankAccount | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreatePartnerBankPayload>();

  const fetchData = async () => {
    setLoading(true);
    try { setList(await partnerBankApi.list(partnerId)); }
    catch { message.error('Failed to load bank accounts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [partnerId]);

  const onAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (b: PartnerBankAccount) => { setEditing(b); setTimeout(() => form.setFieldsValue(b), 0); setOpen(true); };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) await partnerBankApi.update(editing.id, v);
      else         await partnerBankApi.create(partnerId, v);
      message.success('Saved.');
      setOpen(false); void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onDelete = async (b: PartnerBankAccount) => {
    try { await partnerBankApi.remove(b.id); message.success('Deleted.'); void fetchData(); }
    catch { message.error('Delete failed.'); }
  };

  const columns: ColumnsType<PartnerBankAccount> = [
    { title: 'Bank', dataIndex: 'bank_name', key: 'bank_name', render: (n, row) => (
      <Space><strong>{n}</strong>{row.is_primary && <Tag color="gold">primary</Tag>}</Space>
    ) },
    { title: 'Branch', dataIndex: 'branch', key: 'branch' },
    { title: 'Holder', dataIndex: 'account_holder', key: 'account_holder' },
    { title: 'Account #', dataIndex: 'account_no_masked', key: 'account_no_masked', render: (m: string, row) => m ?? row.account_no },
    { title: 'IFSC / SWIFT', key: 'ifsc_swift', render: (_, row) => row.ifsc ?? row.swift ?? '—' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80 },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', width: 80, render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(row)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete ${row.bank_name} account?`,
              content: `Account: ${row.account_no_masked ?? row.account_no}`,
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', width: '100%' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>New bank account</Button>
      </Space>

      <Table<PartnerBankAccount> rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} size="small" />

      <Modal open={open} title={editing ? 'Edit bank account' : 'New bank account'} onCancel={() => setOpen(false)} onOk={onSave} okText="Save" width={700}>
        <Form<CreatePartnerBankPayload> form={form} layout="vertical" initialValues={{ is_active: true, is_primary: false, currency: 'INR', bank_country: 'India' }}>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Bank name" name="bank_name" rules={[{ required: true }]} style={{ flex: 2 }}><Input /></Form.Item>
            <Form.Item label="Branch" name="branch" style={{ flex: 1 }}><Input /></Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Account holder" name="account_holder" rules={[{ required: true }]} style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Account #" name="account_no" rules={[{ required: true }]} style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Account type" name="account_type" style={{ flex: 1 }}>
              <Select allowClear options={[
                { value: 'savings', label: 'Savings' },
                { value: 'current', label: 'Current' },
                { value: 'corporate', label: 'Corporate' },
                { value: 'other', label: 'Other' },
              ]} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="IFSC (India)" name="ifsc" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="SWIFT" name="swift" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="IBAN" name="iban" style={{ flex: 1 }}><Input /></Form.Item>
          </Space.Compact>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Currency" name="currency" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Bank country" name="bank_country" style={{ flex: 1 }}><Input /></Form.Item>
          </Space.Compact>
          <Form.Item label="Bank address" name="bank_address"><Input /></Form.Item>
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
