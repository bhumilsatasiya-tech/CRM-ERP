import { useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { purchaseInvoiceApi } from '../api/purchaseApi';
import DocumentLineEditor, { type DocLine, recalcLine, type DocTaxType } from '../../common/DocumentLineEditor';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import DocumentNumberField from '../../common/DocumentNumberField';
import type { PIStatus, PurchaseInvoice } from '../types/purchase.types';

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD'].map((c) => ({ value: c, label: c }));
const TAX_TYPE_OPTIONS: Array<{ value: DocTaxType; label: string }> = [
  { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
  { value: 'igst',      label: 'IGST (inter-state)' },
  { value: 'none',      label: 'None (out of scope)' },
];

interface HeaderShape {
  code?: string;
  partner_id: number;
  supplier_invoice_no?: string;
  invoice_date: Dayjs; due_date?: Dayjs;
  notes?: string; discount?: number; shipping?: number;
  currency: string;
  tax_type: DocTaxType;
}

export default function PurchaseInvoiceFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [pi, setPi] = useState<PurchaseInvoice | null>(null);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    purchaseInvoiceApi.get(Number(id)).then((p) => {
      setPi(p);
      form.setFieldsValue({
        code: p.code,
        partner_id: p.partner_id,
        supplier_invoice_no: p.supplier_invoice_no ?? undefined,
        invoice_date: dayjs(p.invoice_date),
        due_date: p.due_date ? dayjs(p.due_date) : undefined,
        notes: p.notes ?? undefined,
        discount: p.discount, shipping: p.shipping,
        currency: p.currency,
        tax_type: (p.tax_type ?? 'cgst_sgst') as DocTaxType,
      });
      setLines((p.lines ?? []).map((l, i) => recalcLine({
        key: `e-${l.id ?? i}`,
        product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty), rate: Number(l.rate), tax_rate: Number(l.tax_rate),
        notes: l.notes ?? undefined,
      })));
      if (p.partner) setPartnerLabel(`${p.partner.code} — ${p.partner.name}`);
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        partner_id: v.partner_id,
        supplier_invoice_no: v.supplier_invoice_no,
        invoice_date: v.invoice_date.format('YYYY-MM-DD'),
        due_date: v.due_date?.format('YYYY-MM-DD'),
        notes: v.notes, discount: v.discount ?? 0, shipping: v.shipping ?? 0,
        currency: v.currency,
        tax_type: v.tax_type,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!, hsn_code: l.hsn_code, qty: l.qty, rate: l.rate, tax_rate: l.tax_rate, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && pi) { await purchaseInvoiceApi.update(pi.id, payload); message.success('Saved.'); }
      else {
        const created = await purchaseInvoiceApi.create(payload);
        message.success('PI created.');
        navigate(`/purchase-invoices/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  const onPost = async () => { if (!pi) return; try { setPi(await purchaseInvoiceApi.post(pi.id)); message.success('Posted.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Post failed.'); } };
  const onCancel = async () => { if (!pi) return; try { setPi(await purchaseInvoiceApi.cancel(pi.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const watchedTaxType = (Form.useWatch('tax_type', form) as DocTaxType | undefined) ?? 'cgst_sgst';
  const watchedCurrency = Form.useWatch('currency', form) as string | undefined;
  const status: PIStatus | undefined = pi?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `PI ${pi?.code ?? ''}` : 'New purchase invoice'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/purchase-invoices')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && editing && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Post this PI?', okText: 'Yes, post', danger: false, onOk: onPost })}>Post</Button>}
            {status && status !== 'cancelled' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this PI?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {readOnly && <Alert type="info" showIcon message={`This PI is ${status} — fields are read-only.`} />}
        <Form form={form} layout="vertical" initialValues={{ invoice_date: dayjs(), discount: 0, shipping: 0, currency: 'INR', tax_type: 'cgst_sgst' }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="PI #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="purchase_invoice" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}><Form.Item label="Supplier" name="partner_id" rules={[{ required: true }]}>
              <PartnerSmartDropdown
                type="supplier"
                placeholder="Search supplier..."
                disabled={readOnly}
                fallbackLabel={partnerLabel}
                onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
              />
            </Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Supplier invoice #" name="supplier_invoice_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Invoice date" name="invoice_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Due date" name="due_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><AutoComplete options={CURRENCY_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Tax type" name="tax_type" rules={[{ required: true }]}><Select options={TAX_TYPE_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>
        <DocumentLineEditor
          lines={lines} onChange={setLines} readOnly={readOnly} productTypeFilter="raw"
          taxType={watchedTaxType}
          currency={watchedCurrency}
        />
      </Space>
    </Card>
  );
}
