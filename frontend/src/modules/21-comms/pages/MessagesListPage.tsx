import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { MailOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { commsApi } from '../api/commsApi';
import type { CommChannel, CommMessage, CommStatus } from '../types/comms.types';

const COLORS: Record<CommStatus, string> = { queued: 'default', sent: 'blue', delivered: 'green', failed: 'red' };

export default function MessagesListPage() {
  const [data, setData] = useState<CommMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<CommChannel | undefined>(undefined);
  const [status, setStatus] = useState<CommStatus | undefined>(undefined);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);
  const [emailModal, setEmailModal] = useState(false); const [waModal, setWaModal] = useState(false);
  const [emailForm] = Form.useForm<{ to: string; subject: string; body: string }>();
  const [waForm] = Form.useForm<{ to: string; body: string }>();

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await commsApi.messages({ channel, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [channel, status, page, perPage]);

  const sendEmail = async () => {
    try { const v = await emailForm.validateFields(); await commsApi.sendEmail(v); setEmailModal(false); emailForm.resetFields(); message.success('Sent (logged).'); await fetch(); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; if (err.response) message.error(err.response.data?.message ?? 'Failed.'); }
  };
  const sendWa = async () => {
    try { const v = await waForm.validateFields(); await commsApi.sendWhatsApp(v); setWaModal(false); waForm.resetFields(); message.success('Sent (placeholder driver).'); await fetch(); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; if (err.response) message.error(err.response.data?.message ?? 'Failed.'); }
  };

  const cols: ColumnsType<CommMessage> = [
    { title: 'When', dataIndex: 'created_at', width: 160, render: (v?: string) => v ? new Date(v).toLocaleString() : '—' },
    { title: 'Channel', dataIndex: 'channel', width: 110, render: (c: CommChannel) => <Tag>{c}</Tag> },
    { title: 'To', dataIndex: 'to_addr', width: 200 },
    { title: 'Subject / Body', key: 'sb', render: (_, r) => r.subject ?? r.body.slice(0, 80) },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: CommStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Error', dataIndex: 'error', ellipsis: true },
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Messages</Typography.Title>
          <Space>
            <Select placeholder="Channel" allowClear style={{ width: 140 }} value={channel} onChange={setChannel} options={[{ value: 'email', label: 'email' }, { value: 'whatsapp', label: 'whatsapp' }, { value: 'sms', label: 'sms' }]} />
            <Select placeholder="Status" allowClear style={{ width: 140 }} value={status} onChange={setStatus} options={(['queued', 'sent', 'delivered', 'failed'] as CommStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<MailOutlined />} onClick={() => setEmailModal(true)}>Send email</Button>
            <Button icon={<MessageOutlined />} onClick={() => setWaModal(true)}>Send WhatsApp</Button>
          </Space>
        </Space>
        <Table<CommMessage> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>

      <Modal open={emailModal} title="Send email" onCancel={() => setEmailModal(false)} onOk={sendEmail} okText="Send">
        <Form form={emailForm} layout="vertical">
          <Form.Item label="To" name="to" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item label="Subject" name="subject" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Body" name="body" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
        </Form>
      </Modal>
      <Modal open={waModal} title="Send WhatsApp" onCancel={() => setWaModal(false)} onOk={sendWa} okText="Send">
        <Form form={waForm} layout="vertical">
          <Form.Item label="To (phone)" name="to" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Body" name="body" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
