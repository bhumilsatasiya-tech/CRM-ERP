import { useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { quotationApi } from '../api/quotationApi';
import DocumentLineEditor, { type DocLine, recalcLine, type DocTaxType } from '../../common/DocumentLineEditor';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import DocumentNumberField from '../../common/DocumentNumberField';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import SaveActions from '../../common/SaveActions';
import type { Quotation, QuotationStatus } from '../types/quotation.types';

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD'].map((c) => ({ value: c, label: c }));
const TAX_TYPE_OPTIONS: Array<{ value: DocTaxType; label: string }> = [
  { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
  { value: 'igst',      label: 'IGST (inter-state)' },
  { value: 'none',      label: 'None (export under LUT / out of scope)' },
];

interface HeaderShape {
  code?: string;
  partner_id: number;
  quotation_date: Dayjs; valid_until?: Dayjs;
  reference?: string; notes?: string; terms_and_conditions?: string;
  discount?: number; shipping?: number;
  currency: string;
  tax_type: DocTaxType;
}

export default function QuotationFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [q, setQ] = useState<Quotation | null>(null);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    quotationApi.get(Number(id)).then((x) => {
      setQ(x);
      form.setFieldsValue({
        code: x.code,
        partner_id: x.partner_id,
        quotation_date: dayjs(x.quotation_date),
        valid_until: x.valid_until ? dayjs(x.valid_until) : undefined,
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
        notes: l.notes ?? undefined,
      })));
      if (x.partner) setPartnerLabel(`${x.partner.code} — ${x.partner.name}`);
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async (): Promise<{ id: number; code?: string | null } | null> => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        partner_id: v.partner_id,
        quotation_date: v.quotation_date.format('YYYY-MM-DD'),
        valid_until: v.valid_until?.format('YYYY-MM-DD'),
        reference: v.reference, notes: v.notes,
        terms_and_conditions: v.terms_and_conditions,
        discount: v.discount ?? 0, shipping: v.shipping ?? 0,
        currency: v.currency,
        tax_type: v.tax_type,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!, hsn_code: l.hsn_code, qty: l.qty, rate: l.rate, tax_rate: l.tax_rate, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return null; }
      if (editing && q) {
        const updated = await quotationApi.update(q.id, payload);
        setQ(updated);
        message.success('Saved.');
        return { id: updated.id, code: updated.code };
      }
      const created = await quotationApi.create(payload);
      message.success('Quotation created.');
      return { id: created.id, code: created.code };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
      return null;
    }
    finally { setSaving(false); }
  };

  const onApprove = async () => { if (!q) return; try { setQ(await quotationApi.approve(q.id)); message.success('Approved.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Approve failed.'); } };
  const onCancel = async () => { if (!q) return; try { setQ(await quotationApi.cancel(q.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };
  const onConvert = async () => {
    if (!q) return;
    try {
      const r = await quotationApi.convert(q.id);
      message.success(r.message);
      navigate(`/sales-orders/${r.sales_order_id}/edit`);
    } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Convert failed.'); }
  };

  const watchedTaxType = (Form.useWatch('tax_type', form) as DocTaxType | undefined) ?? 'cgst_sgst';
  const watchedCurrency = Form.useWatch('currency', form) as string | undefined;
  const status: QuotationStatus | undefined = q?.status;
  const readOnly = !!status && status !== 'draft' && status !== 'submitted';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Quotation ${q?.code ?? ''}` : 'New quotation'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/quotations')}>Back</Button>
            {editing && q && <DownloadPdfButton url={`/quotations/${q.id}/pdf`} filename={`quotation-${q.code}.pdf`} />}
            {!readOnly && (
              <SaveActions
                docType="quotation"
                editing={editing}
                doSave={onSave}
                entityId={q?.id}
                entityCode={q?.code}
                disabled={saving}
              />
            )}
            {(status === 'draft' || status === 'submitted') && editing && <Button icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Approve this quotation?', okText: 'Yes, approve', danger: false, onOk: onApprove })}>Approve</Button>}
            {status === 'approved' && <Button type="primary" icon={<RightOutlined />}
              onClick={() => confirmDelete({ title: 'Convert to Sales Order?', okText: 'Yes, convert', danger: false, onOk: onConvert })}>Convert to SO</Button>}
            {status && status !== 'cancelled' && status !== 'converted' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this quotation?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {status === 'converted' && q?.converted_to_sales_order_id && (
          <Alert type="success" showIcon message={<>Converted — <a onClick={() => navigate(`/sales-orders/${q.converted_to_sales_order_id}/edit`)}>open Sales Order #{q.converted_to_sales_order_id}</a></>} />
        )}
        <Form form={form} layout="vertical" initialValues={{ quotation_date: dayjs(), discount: 0, shipping: 0, currency: 'INR', tax_type: 'cgst_sgst' }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Quotation #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="quotation" editing={editing} disabled={readOnly} />
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
            <Col xs={12} md={4}><Form.Item label="Quotation date" name="quotation_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Valid until" name="valid_until"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><AutoComplete options={CURRENCY_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Tax type" name="tax_type" rules={[{ required: true }]}><Select options={TAX_TYPE_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Reference" name="reference"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Terms & conditions" name="terms_and_conditions"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>
        <DocumentLineEditor
          lines={lines} onChange={setLines} readOnly={readOnly} productTypeFilter="finished"
          taxType={watchedTaxType}
          currency={watchedCurrency}
        />
      </Space>
    </Card>
  );
}
