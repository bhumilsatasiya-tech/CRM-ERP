import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Space, Table, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { designationApi } from '../api/hrApi';
import { confirmDelete } from '../../common/confirmDelete';
import type { Designation } from '../types/hr.types';

export default function DesignationsPage() {
  const [data, setData] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing?: Designation }>({ open: false });
  const [form] = Form.useForm<{ code: string; name: string; notes?: string }>();

  const fetch = async () => {
    setLoading(true);
    try { setData(await designationApi.list()); } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); }, []);

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      if (modal.editing) await designationApi.update(modal.editing.id, v);
      else await designationApi.create(v);
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
          <Typography.Title level={4} style={{ margin: 0 }}>Designations</Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true }); }}>New</Button>
        </Space>
        <Table<Designation>
          rowKey="id" dataSource={data} loading={loading} pagination={false} size="middle"
          columns={[
            { title: 'Code', dataIndex: 'code', width: 130 },
            { title: 'Name', dataIndex: 'name' },
            { title: 'Notes', dataIndex: 'notes' },
            { title: '', key: 'a', width: 110, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(r); setModal({ open: true, editing: r }); }} />
                <Button danger size="small" icon={<DeleteOutlined />}
                  onClick={() => confirmDelete({
                    title: `Delete designation "${r.name}"?`,
                    onOk: async () => { await designationApi.remove(r.id); await fetch(); },
                  })} />
              </Space>
            )},
          ]}
        />
      </Space>
      <Modal open={modal.open} title={modal.editing ? 'Edit designation' : 'New designation'} onCancel={() => setModal({ open: false })} onOk={onSubmit}>
        <Form form={form} layout="vertical">
          <Form.Item label="Code" name="code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
