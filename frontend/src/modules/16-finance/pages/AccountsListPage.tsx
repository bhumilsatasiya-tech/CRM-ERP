import { useEffect, useState } from 'react';
import { Button, Card, Input, Modal, Form, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { accountApi } from '../api/financeApi';
import type { Account, AccountType } from '../types/finance.types';

const TYPE_COLORS: Record<AccountType, string> = { asset: 'green', liability: 'red', equity: 'purple', income: 'blue', expense: 'orange' };

export default function AccountsListPage() {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<AccountType | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<{ code: string; name: string; type: AccountType; parent_id?: number; is_group?: boolean; notes?: string }>();

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await accountApi.list({ search: search || undefined, type, per_page: 200 });
      setData(r.data);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [type]);

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      await accountApi.create(v);
      message.success('Account created.');
      setModalOpen(false); form.resetFields();
      await fetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response) message.error(err.response.data?.message ?? 'Failed.');
    }
  };

  const cols: ColumnsType<Account> = [
    { title: 'Code', dataIndex: 'code', width: 100, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Name', dataIndex: 'name', render: (n: string, r) => r.is_group ? <strong>{n}</strong> : n },
    { title: 'Type', dataIndex: 'type', width: 110, render: (t: AccountType) => <Tag color={TYPE_COLORS[t]}>{t}</Tag> },
    { title: 'Group', dataIndex: 'is_group', width: 80, render: (g: boolean) => g ? 'Yes' : '' },
    { title: 'System', dataIndex: 'is_system', width: 90, render: (s: boolean) => s ? <Tag>system</Tag> : '' },
  ];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Chart of accounts</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code/name" allowClear onSearch={(v) => { setSearch(v); void fetch(); }} style={{ width: 240 }} />
            <Select placeholder="Type" allowClear style={{ width: 140 }} value={type} onChange={setType}
              options={(['asset', 'liability', 'equity', 'income', 'expense'] as AccountType[]).map((t) => ({ value: t, label: t }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New account</Button>
          </Space>
        </Space>
        <Table<Account> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={false} size="middle" />
      </Space>

      <Modal open={modalOpen} title="New account" onCancel={() => setModalOpen(false)} onOk={onSubmit} okText="Create">
        <Form form={form} layout="vertical">
          <Form.Item label="Code" name="code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Select options={(['asset', 'liability', 'equity', 'income', 'expense'] as AccountType[]).map((t) => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item label="Parent" name="parent_id">
            <Select allowClear options={data.filter((a) => a.is_group).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))} />
          </Form.Item>
          <Form.Item label="Is group" name="is_group" valuePropName="checked"><Input type="checkbox" /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
