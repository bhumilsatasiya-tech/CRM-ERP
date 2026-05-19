import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CloseOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { loansApi } from '../api/loansApi';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import type { EmiStatus, Loan, LoanStatus, LoanType } from '../types/loans.types';

interface HeaderShape {
  code?: string;
  type: LoanType;
  partner_id?: number;
  principal: number;
  interest_rate_pct: number;
  tenure_months: number;
  start_date: Dayjs;
  notes?: string;
}

const EMI_COLORS: Record<EmiStatus, string> = { pending: 'default', partial: 'gold', paid: 'green', overdue: 'red' };

export default function LoanFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [payForm] = Form.useForm<{ amount: number; payment_date: Dayjs; mode: string; bank_ref?: string; emi_id?: number; notes?: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    loansApi.get(Number(id)).then((x) => {
      setLoan(x);
      form.setFieldsValue({
        code: x.code,
        type: x.type, partner_id: x.partner_id ?? undefined,
        principal: x.principal, interest_rate_pct: x.interest_rate_pct,
        tenure_months: x.tenure_months, start_date: dayjs(x.start_date),
        notes: x.notes ?? undefined,
      });
      if (x.partner) setPartnerLabel(`${x.partner.code} — ${x.partner.name}`);
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = { ...v, start_date: v.start_date.format('YYYY-MM-DD') };
      if (editing && loan) { await loansApi.update(loan.id, payload); message.success('Saved.'); }
      else {
        const created = await loansApi.create(payload);
        message.success('Loan created with EMI schedule.');
        navigate(`/loans/${created.id}`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onPay = async () => {
    if (!loan) return;
    try {
      const v = await payForm.validateFields();
      const r = await loansApi.recordPayment(loan.id, {
        amount: v.amount, payment_date: v.payment_date.format('YYYY-MM-DD') as unknown as string,
        mode: v.mode, bank_ref: v.bank_ref, emi_id: v.emi_id, notes: v.notes,
      });
      setLoan(r.loan);
      setPayOpen(false); payForm.resetFields();
      message.success('Payment recorded.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    }
  };

  const onCancel = async () => { if (!loan) return; try { setLoan(await loansApi.cancel(loan.id)); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Failed.'); } };

  const status: LoanStatus | undefined = loan?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Loan ${loan?.code ?? ''}` : 'New loan'} {status && <Tag>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/loans')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'active' && loan && <Button type="primary" icon={<DollarCircleOutlined />} onClick={() => { payForm.setFieldsValue({ amount: loan.emi_amount, payment_date: dayjs(), mode: 'bank' }); setPayOpen(true); }}>Record payment</Button>}
            {(status === 'draft' || status === 'active') && loan && (loan.payments ?? []).length === 0 && (
              <Button danger icon={<CloseOutlined />}
                onClick={() => confirmDelete({ title: 'Cancel this loan?', content: 'Only allowed if no payments have been recorded.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>
            )}
          </Space>
        </Space>
        {status === 'closed' && <Alert type="success" showIcon message="Loan fully repaid." />}

        <Form form={form} layout="vertical" initialValues={{ type: 'borrowed', interest_rate_pct: 12, tenure_months: 12, start_date: dayjs() }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Loan #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="loan" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}><Form.Item label="Type" name="type" rules={[{ required: true }]}><Select options={[{ value: 'borrowed', label: 'Borrowed' }, { value: 'given', label: 'Given' }]} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Counterparty" name="partner_id">
              <PartnerSmartDropdown
                placeholder="Search partner..."
                allowClear
                disabled={readOnly}
                fallbackLabel={partnerLabel}
                onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
              />
            </Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Principal" name="principal" rules={[{ required: true }]}><InputNumber min={1} step={1000} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Rate %" name="interest_rate_pct" rules={[{ required: true }]}><InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Tenure (m)" name="tenure_months" rules={[{ required: true }]}><InputNumber min={1} max={600} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Start date" name="start_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        {loan && (
          <Row gutter={16}>
            <Col xs={12} md={6}><Statistic title="EMI" value={loan.emi_amount} precision={2} /></Col>
            <Col xs={12} md={6}><Statistic title="Total payable" value={loan.total_payable} precision={2} /></Col>
            <Col xs={12} md={6}><Statistic title="Total interest" value={loan.total_interest} precision={2} /></Col>
            <Col xs={12} md={6}><Statistic title="Outstanding principal" value={loan.outstanding_principal} precision={2} /></Col>
          </Row>
        )}

        {loan?.schedule && loan.schedule.length > 0 && (
          <Card size="small" title={`EMI schedule (${loan.schedule.length})`}>
            <Table
              rowKey="id" size="small" pagination={false}
              dataSource={loan.schedule}
              columns={[
                { title: '#', dataIndex: 'installment_no', width: 60 },
                { title: 'Due', dataIndex: 'due_date', width: 120 },
                { title: 'Principal', dataIndex: 'principal_component', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
                { title: 'Interest', dataIndex: 'interest_component', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
                { title: 'EMI', dataIndex: 'emi_amount', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
                { title: 'Paid', dataIndex: 'paid_amount', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
                { title: 'Status', dataIndex: 'status', width: 110, render: (s: EmiStatus) => <Tag color={EMI_COLORS[s]}>{s}</Tag> },
              ]}
            />
          </Card>
        )}

        {loan?.payments && loan.payments.length > 0 && (
          <Card size="small" title={`Payments (${loan.payments.length})`}>
            <Table
              rowKey="id" size="small" pagination={false}
              dataSource={loan.payments}
              columns={[
                { title: 'Date', dataIndex: 'payment_date', width: 120 },
                { title: 'Amount', dataIndex: 'amount', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
                { title: 'Mode', dataIndex: 'mode', width: 100 },
                { title: 'Bank ref', dataIndex: 'bank_ref' },
                { title: 'Notes', dataIndex: 'notes' },
              ]}
            />
          </Card>
        )}
      </Space>

      <Modal open={payOpen} title="Record loan payment" onCancel={() => setPayOpen(false)} onOk={onPay} okText="Record">
        <Form form={payForm} layout="vertical" initialValues={{ payment_date: dayjs(), mode: 'bank' }}>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}><InputNumber min={0.01} step={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Date" name="payment_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Mode" name="mode" rules={[{ required: true }]}><Select options={[{ value: 'bank', label: 'Bank' }, { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'upi', label: 'UPI' }]} /></Form.Item>
          <Form.Item label="Bank ref" name="bank_ref"><Input /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
