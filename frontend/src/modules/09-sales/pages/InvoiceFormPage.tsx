import { useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { invoiceApi, salesOrderApi } from '../api/salesApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { useAppSelector } from '../../../app/hooks';
import DocumentLineEditor, { type DocLine, recalcLine, type DocTaxType } from '../../common/DocumentLineEditor';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import DocumentNumberField from '../../common/DocumentNumberField';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import SaveActions from '../../common/SaveActions';
import VoucherChainStrip, { type ChainNode } from '../../common/VoucherChainStrip';
import type { Invoice, InvoiceStatus } from '../types/sales.types';

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD'].map((c) => ({ value: c, label: c }));
const TAX_TYPE_OPTIONS: Array<{ value: DocTaxType; label: string }> = [
  { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
  { value: 'igst',      label: 'IGST (inter-state)' },
  { value: 'none',      label: 'None (export under LUT / out of scope)' },
];

interface HeaderShape {
  code?: string;
  partner_id: number; sales_order_id?: number | null; warehouse_id: number;
  invoice_date: Dayjs; due_date?: Dayjs;
  reference?: string; notes?: string; terms_and_conditions?: string;
  discount?: number; shipping?: number;
  currency: string;
  tax_type: DocTaxType;
}

export default function InvoiceFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromSoId = params.get('from_so');
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);

  const [form] = Form.useForm<HeaderShape>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);
  const [warehouses, setWarehouses] = useState<Array<{ value: number; label: string }>>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm] = Form.useForm<{ amount: number; payment_date: Dayjs; mode: string; reference?: string; notes?: string }>();

  useEffect(() => {
    if (activeCompanyId) {
      warehouseApi.list(activeCompanyId, { per_page: 200 }).then((r) => setWarehouses(r.data.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })))).catch(() => undefined);
    }
  }, [activeCompanyId]);

  // Editing existing invoice
  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    invoiceApi.get(Number(id)).then((x) => {
      setInv(x);
      form.setFieldsValue({
        code: x.code,
        partner_id: x.partner_id,
        sales_order_id: x.sales_order_id,
        warehouse_id: x.warehouse_id,
        invoice_date: dayjs(x.invoice_date),
        due_date: x.due_date ? dayjs(x.due_date) : undefined,
        reference: x.reference ?? undefined,
        notes: x.notes ?? undefined,
        terms_and_conditions: x.terms_and_conditions ?? undefined,
        discount: x.discount, shipping: x.shipping,
        currency: x.currency,
        tax_type: (x.tax_type ?? 'cgst_sgst') as DocTaxType,
      });
      setLines((x.lines ?? []).map((l, i) => recalcLine({
        key: `e-${l.id ?? i}`, product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty), rate: Number(l.rate), tax_rate: Number(l.tax_rate),
        batch_no: l.batch_no ?? undefined,
        expiry_date: l.expiry_date ?? undefined,
        notes: l.notes ?? undefined,
      })));
      if (x.partner) setPartnerLabel(`${x.partner.code} — ${x.partner.name}`);
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  // New invoice from SO (prefill)
  useEffect(() => {
    if (editing) return;
    if (!fromSoId) return;
    (async () => {
      try {
        const so = await salesOrderApi.get(Number(fromSoId));
        form.setFieldsValue({
          partner_id: so.partner_id,
          sales_order_id: so.id,
          warehouse_id: so.warehouse_id ?? undefined,
          invoice_date: dayjs(),
          reference: so.reference ?? undefined,
          terms_and_conditions: so.terms_and_conditions ?? undefined,
          notes: so.notes ?? undefined,
          discount: so.discount, shipping: so.shipping,
          currency: so.currency,
          tax_type: (so.tax_type ?? 'cgst_sgst') as DocTaxType,
        });
        setLines((so.lines ?? [])
          .filter((l) => Number(l.qty) > Number(l.invoiced_qty ?? 0))
          .map((l, i) => recalcLine({
            key: `from-${l.id ?? i}`,
            product_id: l.product_id,
            product_code: l.product?.code, product_name: l.product?.name,
            hsn_code: l.hsn_code ?? undefined,
            qty: Number(l.qty) - Number(l.invoiced_qty ?? 0),
            rate: Number(l.rate),
            tax_rate: Number(l.tax_rate),
            notes: l.notes ?? undefined,
          })));
        if (so.partner) setPartnerLabel(`${so.partner.code} — ${so.partner.name}`);
      } catch { message.error('Could not prefill from SO.'); }
    })();
  }, [editing, fromSoId, form]);

  /**
   * Returns the saved Invoice record (so SaveActions can chain "Save & New" / "Save & Print" / etc.).
   * Returns null on validation failure or API error.
   */
  const onSave = async (): Promise<{ id: number; code?: string | null } | null> => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        partner_id: v.partner_id,
        sales_order_id: v.sales_order_id ?? null,
        warehouse_id: v.warehouse_id,
        invoice_date: v.invoice_date.format('YYYY-MM-DD'),
        due_date: v.due_date?.format('YYYY-MM-DD'),
        reference: v.reference, notes: v.notes,
        terms_and_conditions: v.terms_and_conditions,
        discount: v.discount ?? 0, shipping: v.shipping ?? 0,
        currency: v.currency,
        tax_type: v.tax_type,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!, hsn_code: l.hsn_code, qty: l.qty, rate: l.rate, tax_rate: l.tax_rate,
          batch_no: l.batch_no, expiry_date: l.expiry_date, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return null; }
      if (editing && inv) {
        const updated = await invoiceApi.update(inv.id, payload);
        setInv(updated);
        message.success('Saved.');
        return { id: updated.id, code: updated.code };
      }
      const created = await invoiceApi.create(payload);
      message.success('Invoice created.');
      return { id: created.id, code: created.code };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
      return null;
    }
    finally { setSaving(false); }
  };

  const onPost = async () => { if (!inv) return; try { setInv(await invoiceApi.post(inv.id)); message.success('Posted — stock OUT recorded.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Post failed.'); } };
  const onCancel = async () => { if (!inv) return; try { setInv(await invoiceApi.cancel(inv.id, 'Cancelled by user')); message.success('Cancelled — stock reversed.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };
  const onPay = async () => {
    if (!inv) return;
    const v = await payForm.validateFields();
    try {
      const r = await invoiceApi.recordPayment(inv.id, {
        amount: v.amount,
        payment_date: v.payment_date.format('YYYY-MM-DD'),
        mode: v.mode, reference: v.reference, notes: v.notes,
      });
      setInv(r.invoice);
      setPayOpen(false);
      payForm.resetFields();
      message.success('Payment recorded.');
    } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Payment failed.'); }
  };
  const onDeletePayment = async (paymentId: number) => {
    if (!inv) return;
    try { setInv(await invoiceApi.deletePayment(inv.id, paymentId)); message.success('Payment deleted.'); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Delete failed.'); }
  };

  const watchedTaxType = (Form.useWatch('tax_type', form) as DocTaxType | undefined) ?? 'cgst_sgst';
  const watchedCurrency = Form.useWatch('currency', form) as string | undefined;
  const status: InvoiceStatus | undefined = inv?.status;
  const readOnly = !!status && status !== 'draft';

  // Build the voucher chain: upstream Sales Order, current Invoice, downstream Payments
  const chain: ChainNode[] = editing && inv ? [
    ...(inv.sales_order_id ? [{ type: 'sales-order' as const, id: inv.sales_order_id, code: `SO #${inv.sales_order_id}` }] : []),
    { type: 'invoice' as const, id: inv.id, code: inv.code, current: true, status: inv.status },
    ...((inv.payments?.length ?? 0) > 0 ? [{
      type: 'payment' as const, id: inv.id, code: `${inv.payments!.length} payment${inv.payments!.length === 1 ? '' : 's'}`,
      badge: `₹${inv.payments!.reduce((s, p) => s + Number(p.amount ?? 0), 0).toFixed(0)}`,
    }] : []),
  ] : [];

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {chain.length > 1 && <VoucherChainStrip chain={chain} title="Chain" />}
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Tax Invoice ${inv?.code ?? ''}` : 'New Tax Invoice'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/invoices')}>Back</Button>
            {editing && inv && <DownloadPdfButton url={`/invoices/${inv.id}/pdf`} filename={`invoice-${inv.code}.pdf`} />}
            {!readOnly && (
              <SaveActions
                docType="invoice"
                editing={editing}
                doSave={onSave}
                entityId={inv?.id}
                entityCode={inv?.code}
                disabled={saving}
              />
            )}
            {status === 'draft' && editing && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Post this invoice?', content: 'Stock will be written OUT and the invoice locked.', okText: 'Yes, post', danger: false, onOk: onPost })}>Post</Button>}
            {(status === 'posted' || status === 'partially_paid') && <Button icon={<DollarOutlined />} onClick={() => { payForm.setFieldsValue({ amount: inv?.balance ?? 0, payment_date: dayjs(), mode: 'bank' }); setPayOpen(true); }}>Record payment</Button>}
            {status && status !== 'cancelled' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this invoice?', content: 'Stock OUT will be reversed and the invoice marked cancelled.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {readOnly && status !== 'cancelled' && <Alert type="success" showIcon message={`Invoice ${status}. Total ${inv?.total.toFixed(2)} — paid ${inv?.paid_amount.toFixed(2)}, balance ${inv?.balance.toFixed(2)}.`} />}
        {status === 'cancelled' && <Alert type="error" showIcon message="Invoice cancelled. Stock OUT has been reversed." />}

        <Form form={form} layout="vertical" initialValues={{ invoice_date: dayjs(), discount: 0, shipping: 0, currency: 'INR', tax_type: 'cgst_sgst' }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Tax Invoice #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="invoice" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}><Form.Item label="Client" name="partner_id" rules={[{ required: true }]}>
              <PartnerSmartDropdown
                type="client"
                placeholder="Search client..."
                disabled={readOnly}
                fallbackLabel={partnerLabel}
                onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
              />
            </Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Ship from warehouse" name="warehouse_id" rules={[{ required: true }]}><Select options={warehouses} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Invoice date" name="invoice_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Due date" name="due_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><AutoComplete options={CURRENCY_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Tax type" name="tax_type" rules={[{ required: true }]}><Select options={TAX_TYPE_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Client PO #" name="reference"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Terms & conditions" name="terms_and_conditions"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        <DocumentLineEditor
          lines={lines} onChange={setLines} readOnly={readOnly} showBatch productTypeFilter="finished"
          taxType={watchedTaxType}
          currency={watchedCurrency}
        />

        {inv && inv.payments && inv.payments.length > 0 && (
          <>
            <Typography.Text strong style={{ display: 'block', marginTop: 16 }}>Payments</Typography.Text>
            <Table
              rowKey="id"
              dataSource={inv.payments}
              size="small"
              pagination={false}
              columns={[
                { title: 'Date', dataIndex: 'payment_date', width: 120 },
                { title: 'Mode', dataIndex: 'mode', width: 100 },
                { title: 'Amount', dataIndex: 'amount', align: 'right' as const, width: 130, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Reference', dataIndex: 'reference' },
                { title: 'Notes', dataIndex: 'notes' },
                { title: '', key: 'a', width: 60, render: (_: unknown, p) => (
                  <Button danger size="small" icon={<DeleteOutlined />}
                    onClick={() => confirmDelete({
                      title: 'Delete this payment?',
                      content: 'The invoice paid amount and balance will be recalculated.',
                      onOk: () => onDeletePayment(p.id),
                    })} />
                )},
              ]}
            />
          </>
        )}
      </Space>

      <Modal open={payOpen} title="Record payment" onCancel={() => setPayOpen(false)} onOk={onPay} okText="Record">
        <Form form={payForm} layout="vertical" initialValues={{ payment_date: dayjs(), mode: 'bank' }}>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Payment date" name="payment_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Mode" name="mode" rules={[{ required: true }]}>
            <Select options={[{ value: 'bank', label: 'Bank' }, { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }]} />
          </Form.Item>
          <Form.Item label="Reference" name="reference"><Input placeholder="Cheque #, UTR, etc." /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
