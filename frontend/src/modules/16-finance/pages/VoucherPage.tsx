import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, DatePicker, Empty, Form, Input, InputNumber, Row, Select,
  Space, Statistic, Table, Tag, Typography, message,
} from 'antd';
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import { voucherApi, type OpenInvoiceRow } from '../api/voucherApi';

type Mode = 'supplier-payment' | 'buyer-receipt';

interface Props {
  mode: Mode;
}

const CFG: Record<Mode, {
  title: string;
  partnerLabel: string;
  partnerType: 'supplier' | 'client';
  invoiceLabel: string;
  apiCall: typeof voucherApi.supplierPayment;
  successWord: string;
  listType: 'sales' | 'purchase';
  detailPath: (id: number) => string;
}> = {
  'supplier-payment': {
    title: 'Supplier Payment',
    partnerLabel: 'Supplier',
    partnerType: 'supplier',
    invoiceLabel: 'Open Purchase Invoices',
    apiCall: voucherApi.supplierPayment,
    successWord: 'paid',
    listType: 'purchase',
    detailPath: (id: number) => `/purchase-invoices/${id}/edit`,
  },
  'buyer-receipt': {
    title: 'Buyer Receipt',
    partnerLabel: 'Buyer (Client)',
    partnerType: 'client',
    invoiceLabel: 'Open Invoices',
    apiCall: voucherApi.buyerReceipt,
    successWord: 'received',
    listType: 'sales',
    detailPath: (id: number) => `/invoices/${id}/edit`,
  },
};

interface Header {
  partner_id?: number;
  amount?: number;
  payment_date?: Dayjs;
  mode?: string;
  reference?: string;
  notes?: string;
}

export default function VoucherPage({ mode }: Props) {
  const cfg = CFG[mode];
  const navigate = useNavigate();
  const [form] = Form.useForm<Header>();
  const [partnerId, setPartnerId] = useState<number | undefined>();
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>();
  const [openRows, setOpenRows] = useState<OpenInvoiceRow[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const amount = Form.useWatch('amount', form) as number | undefined;

  const loadOpen = async (pid: number) => {
    setLoading(true);
    try {
      const r = await voucherApi.openInvoices(pid, cfg.listType);
      setOpenRows(r.rows);
      setTotalOutstanding(r.total_outstanding);
    } catch { message.error('Failed to load open invoices.'); } finally { setLoading(false); }
  };

  useEffect(() => { if (partnerId) void loadOpen(partnerId); }, [partnerId]); // eslint-disable-line

  // Preview allocation: distribute `amount` oldest-first across openRows
  const allocPreview = (() => {
    if (!amount || amount <= 0) return openRows.map((r) => ({ ...r, apply: 0, newBalance: r.balance }));
    let remaining = amount;
    return openRows.map((r) => {
      const apply = Math.min(remaining, r.balance);
      remaining = Math.max(0, remaining - apply);
      return { ...r, apply, newBalance: r.balance - apply };
    });
  })();

  const fullyApplied = (amount ?? 0) <= totalOutstanding + 0.01;

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      if (!v.partner_id) { message.error('Pick a partner.'); return; }
      if (!v.amount || v.amount <= 0) { message.error('Enter a positive amount.'); return; }
      if (v.amount > totalOutstanding + 0.01) {
        message.error(`Amount ${v.amount} exceeds total open balance ${totalOutstanding.toFixed(2)}.`);
        return;
      }
      setSaving(true);
      const payload = {
        partner_id: v.partner_id,
        amount: v.amount,
        payment_date: (v.payment_date ?? dayjs()).format('YYYY-MM-DD'),
        mode: v.mode ?? 'bank',
        reference: v.reference,
        notes: v.notes,
      };
      const r = await cfg.apiCall(payload);
      message.success(`${cfg.successWord} ${r.total_applied.toFixed(2)} across ${r.payments_created} invoices.`);
      form.resetFields(['amount', 'reference', 'notes']);
      if (partnerId) void loadOpen(partnerId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <Card loading={false}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{cfg.title}</Typography.Title>
        <Alert
          type="info" showIcon
          message={
            mode === 'supplier-payment'
              ? 'Pick a supplier → enter the amount you want to pay → it auto-allocates oldest-due-first across their open Purchase Invoices.'
              : 'Pick a buyer → enter the amount they paid → it auto-allocates oldest-due-first across their open Invoices.'
          }
        />

        <Form<Header> form={form} layout="vertical" initialValues={{ payment_date: dayjs(), mode: 'bank' }}>
          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item label={cfg.partnerLabel} name="partner_id" rules={[{ required: true }]}>
                <PartnerSmartDropdown
                  type={cfg.partnerType}
                  placeholder={`Search ${cfg.partnerLabel.toLowerCase()}...`}
                  fallbackLabel={partnerLabel}
                  onPartnerSelect={(p) => {
                    if (p?.id) {
                      setPartnerId(Number(p.id));
                      if (p.code && p.name) setPartnerLabel(`${p.code} — ${p.name}`);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item label="Amount" name="amount" rules={[{ required: true, type: 'number', min: 0.01 }]}>
                <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} placeholder="Total to apply" />
              </Form.Item>
            </Col>
            <Col xs={12} md={3}>
              <Form.Item label="Date" name="payment_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} md={3}>
              <Form.Item label="Mode" name="mode">
                <Select options={[
                  { value: 'bank', label: 'Bank' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'upi', label: 'UPI' },
                  { value: 'card', label: 'Card' },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Reference" name="reference"><Input placeholder="Bank ref / cheque no." /></Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
            </Col>
          </Row>
        </Form>

        {partnerId && (
          <>
            <Space size="large" wrap style={{ justifyContent: 'space-between', width: '100%' }}>
              <Typography.Text strong>{cfg.invoiceLabel} ({openRows.length})</Typography.Text>
              <Space size="large">
                <Statistic title="Total outstanding" value={totalOutstanding} precision={2} />
                <Statistic
                  title="You're applying"
                  value={Math.min(amount ?? 0, totalOutstanding)}
                  precision={2}
                  valueStyle={{ color: (amount ?? 0) > totalOutstanding ? '#cf1322' : '#3f8600' }}
                />
                <Button icon={<ReloadOutlined />} onClick={() => partnerId && loadOpen(partnerId)}>Reload</Button>
              </Space>
            </Space>

            {!fullyApplied && (
              <Alert type="error" showIcon message={`Amount ${(amount ?? 0).toFixed(2)} exceeds the total open balance ${totalOutstanding.toFixed(2)}.`} />
            )}

            <Table<typeof allocPreview[number]>
              rowKey="id"
              dataSource={allocPreview}
              loading={loading}
              pagination={false}
              size="small"
              locale={{ emptyText: <Empty description="No open invoices for this partner" /> }}
              columns={[
                { title: 'Date', dataIndex: 'invoice_date', width: 110 },
                { title: 'Due', dataIndex: 'due_date', width: 110, render: (v: string | null) => v ?? '—' },
                {
                  title: '#', dataIndex: 'code', width: 180,
                  render: (v: string, r) => <a onClick={() => navigate(cfg.detailPath(r.id))}>{v}</a>,
                },
                { title: 'Status', dataIndex: 'status', width: 130, render: (s: string) => <Tag>{s}</Tag> },
                { title: 'Total', dataIndex: 'total', align: 'right', width: 120, render: (v: number) => Number(v).toFixed(2) },
                { title: 'Paid', dataIndex: 'paid_amount', align: 'right', width: 120, render: (v: number) => Number(v).toFixed(2) },
                { title: 'Open balance', dataIndex: 'balance', align: 'right', width: 130,
                  render: (v: number) => <strong>{Number(v).toFixed(2)}</strong> },
                { title: 'Will apply', dataIndex: 'apply', align: 'right', width: 130,
                  render: (v: number) => v > 0
                    ? <strong style={{ color: '#3f8600' }}>{v.toFixed(2)}</strong>
                    : '—' },
                { title: 'After', dataIndex: 'newBalance', align: 'right', width: 130,
                  render: (v: number) => <span style={{ color: v <= 0.01 ? '#3f8600' : undefined }}>{v.toFixed(2)}</span> },
              ]}
            />

            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button onClick={() => navigate('/finance/ledgers')}>Cancel</Button>
              <Button type="primary" icon={<CheckOutlined />} loading={saving}
                disabled={!amount || amount <= 0 || !fullyApplied}
                onClick={onSubmit}>
                Save {cfg.title}
              </Button>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
}
