import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CloseOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { exportIncentiveApi } from '../api/exportIncentivesApi';
import type { ExportIncentiveClaim, IncentiveStatus, IncentiveType } from '../types/exportIncentives.types';

interface FormShape {
  type: IncentiveType;
  shipping_bill_id?: number | null;
  export_invoice_id?: number | null;
  claim_no?: string;
  claim_date: Dayjs;
  claim_amount: number;
  claim_currency: string;
  notes?: string;
}

export default function ExportIncentiveFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormShape>();
  const [creditForm] = Form.useForm<{ credited_amount: number; credited_date: Dayjs; bank_ref?: string }>();
  const [claim, setClaim] = useState<ExportIncentiveClaim | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    exportIncentiveApi.get(Number(id))
      .then((c) => {
        setClaim(c);
        form.setFieldsValue({
          type: c.type,
          shipping_bill_id: c.shipping_bill_id ?? undefined,
          export_invoice_id: c.export_invoice_id ?? undefined,
          claim_no: c.claim_no ?? undefined,
          claim_date: dayjs(c.claim_date),
          claim_amount: c.claim_amount,
          claim_currency: c.claim_currency,
          notes: c.notes ?? undefined,
        });
      })
      .catch(() => message.error('Failed to load.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = { ...v, claim_date: v.claim_date.format('YYYY-MM-DD') };
      if (editing && claim) {
        const updated = await exportIncentiveApi.update(claim.id, payload);
        setClaim(updated);
        message.success('Saved.');
      } else {
        const created = await exportIncentiveApi.create(payload);
        message.success('Claim created.');
        navigate(`/export-incentives/${created.id}`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const transition = async (to: IncentiveStatus, payload: Record<string, unknown> = {}) => {
    if (!claim) return;
    try {
      const updated = await exportIncentiveApi.transition(claim.id, to, payload);
      setClaim(updated);
      message.success(`Marked ${to}.`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Transition failed.');
    }
  };

  const onCredit = async () => {
    const v = await creditForm.validateFields();
    await transition('credited', { credited_amount: v.credited_amount, credited_date: v.credited_date.format('YYYY-MM-DD'), bank_ref: v.bank_ref });
    setCreditOpen(false);
    creditForm.resetFields();
  };

  const status = claim?.status;

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing ? `Claim ${claim?.claim_no ?? `#${claim?.id ?? ''}`}` : 'New incentive claim'}
            {status && <Tag style={{ marginLeft: 8 }} color={status === 'credited' ? 'green' : status === 'rejected' ? 'red' : 'blue'}>{status}</Tag>}
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/export-incentives')}>Back</Button>
            <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>
            {status === 'pending' && <Button
              onClick={() => confirmDelete({ title: 'Mark as filed with the govt?', okText: 'Yes, mark filed', danger: false, onOk: () => transition('filed') })}>Mark filed</Button>}
            {status === 'filed' && <Button
              onClick={() => confirmDelete({ title: 'Mark as approved by govt?', okText: 'Yes, approve', danger: false, onOk: () => transition('approved') })}>Mark approved</Button>}
            {status === 'approved' && <Button type="primary" icon={<DollarCircleOutlined />} onClick={() => { creditForm.setFieldsValue({ credited_amount: claim?.claim_amount ?? 0, credited_date: dayjs() }); setCreditOpen(true); }}>Record credit</Button>}
            {status && status !== 'credited' && status !== 'rejected' && (
              <Button danger icon={<CloseOutlined />}
                onClick={() => Modal.confirm({
                  title: 'Mark this claim as rejected?',
                  content: (
                    <div>
                      <div style={{ marginBottom: 8 }}>Reason (optional):</div>
                      <Input.TextArea id="rej-reason" rows={3} />
                    </div>
                  ),
                  centered: true,
                  okText: 'Yes, reject',
                  cancelText: 'No, keep it',
                  okButtonProps: { danger: true },
                  onOk: () => {
                    const reason = (document.getElementById('rej-reason') as HTMLTextAreaElement)?.value ?? '';
                    return transition('rejected', { rejection_reason: reason });
                  },
                })}>Reject</Button>
            )}
          </Space>
        </Space>

        {status === 'credited' && claim?.credited_amount != null && (
          <Alert type="success" showIcon message={`Credited ${claim.claim_currency} ${Number(claim.credited_amount).toFixed(2)} on ${claim.credited_date}.`} />
        )}
        {status === 'rejected' && claim?.rejection_reason && (
          <Alert type="error" showIcon message={`Rejected: ${claim.rejection_reason}`} />
        )}

        <Form<FormShape> form={form} layout="vertical" initialValues={{ type: 'drawback', claim_date: dayjs(), claim_currency: 'INR' }}>
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label="Type" name="type" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'drawback',    label: 'Duty Drawback' },
                  { value: 'igst_refund', label: 'IGST Refund' },
                  { value: 'rodtep',      label: 'RoDTEP' },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}><Form.Item label="Govt claim # (optional)" name="claim_no"><Input maxLength={64} placeholder="e.g. ICEGATE token" /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Claim date" name="claim_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Currency" name="claim_currency" rules={[{ required: true }]}><Input maxLength={8} /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item label="Claim amount" name="claim_amount" rules={[{ required: true }]}><InputNumber min={0.01} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>

            <Col xs={24} md={6}><Form.Item label="Shipping bill ID (optional)" name="shipping_bill_id"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Export invoice ID (optional)" name="export_invoice_id"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>

            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Space>

      <Modal open={creditOpen} title="Record bank credit" onCancel={() => setCreditOpen(false)} onOk={onCredit} okText="Record">
        <Form form={creditForm} layout="vertical" initialValues={{ credited_date: dayjs() }}>
          <Form.Item label="Credited amount" name="credited_amount" rules={[{ required: true }]}><InputNumber min={0.01} step={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Credited date"   name="credited_date"   rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Bank reference"  name="bank_ref"><Input maxLength={128} placeholder="UTR / cheque #" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
