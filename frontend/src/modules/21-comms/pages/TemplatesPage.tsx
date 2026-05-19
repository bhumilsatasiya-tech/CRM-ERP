import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { commsApi } from '../api/commsApi';
import { confirmDelete } from '../../common/confirmDelete';
import type { CommChannel, CommTemplate } from '../types/comms.types';

export default function TemplatesPage() {
  const [data, setData] = useState<CommTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing?: CommTemplate }>({ open: false });
  const [form] = Form.useForm<Partial<CommTemplate>>();

  const fetch = async () => {
    setLoading(true);
    try { setData(await commsApi.templates()); } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); }, []);

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      if (modal.editing) await commsApi.updateTemplate(modal.editing.id, v);
      else await commsApi.saveTemplate(v);
      setModal({ open: false }); form.resetFields();
      message.success('Saved.');
      await fetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response) message.error(err.response.data?.message ?? 'Failed.');
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Templates</Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ channel: 'email', is_active: true }); setModal({ open: true }); }}>New template</Button>
        </Space>
        <Table<CommTemplate>
          rowKey="id" dataSource={data} loading={loading} pagination={false} size="middle"
          columns={[
            { title: 'Code', dataIndex: 'code', width: 130 },
            { title: 'Name', dataIndex: 'name' },
            { title: 'Channel', dataIndex: 'channel', width: 110, render: (c: CommChannel) => <Tag>{c}</Tag> },
            { title: 'Subject', dataIndex: 'subject', ellipsis: true },
            { title: 'Active', dataIndex: 'is_active', width: 80, render: (a: boolean) => a ? 'Yes' : 'No' },
            { title: '', key: 'a', width: 110, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(r); setModal({ open: true, editing: r }); }} />
                <Button danger size="small" icon={<DeleteOutlined />}
                  onClick={() => confirmDelete({
                    title: `Delete template "${r.code}"?`,
                    onOk: async () => { await commsApi.removeTemplate(r.id); await fetch(); },
                  })} />
              </Space>
            )},
          ]}
        />
      </Space>
      <Modal open={modal.open} title={modal.editing ? 'Edit template' : 'New template'} onCancel={() => setModal({ open: false })} onOk={onSubmit}>
        <Form form={form} layout="vertical">
          <Form.Item label="Code" name="code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Channel" name="channel" rules={[{ required: true }]}><Select options={[{ value: 'email', label: 'email' }, { value: 'whatsapp', label: 'whatsapp' }, { value: 'sms', label: 'sms' }]} /></Form.Item>
          <Form.Item label="Subject" name="subject"><Input placeholder="For email" /></Form.Item>
          <Form.Item label="Body" name="body" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="Use {{placeholders}} for variables" />
          </Form.Item>
          <Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
