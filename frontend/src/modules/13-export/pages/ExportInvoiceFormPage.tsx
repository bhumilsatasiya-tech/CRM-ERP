import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined, ExperimentOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { exportInvoiceApi } from '../api/exportApi';
import { salesOrderApi } from '../../09-sales/api/salesApi';
import { partnerApi } from '../../04-crm/api/partnerApi';
import DocumentLineEditor, { type DocLine, recalcLine, totalsOf } from '../../common/DocumentLineEditor';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import DocumentNumberField from '../../common/DocumentNumberField';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import type { ExportInvoice, ExportInvoiceStatus, Incoterm, TransportMode } from '../types/export.types';

interface HeaderShape {
  code?: string;
  partner_id: number;
  invoice_date: Dayjs;
  date_of_supply?: Dayjs;
  due_date?: Dayjs;
  reference?: string;

  currency: string;
  tax_type?: 'cgst_sgst' | 'igst' | 'none';

  incoterm: Incoterm;
  transport_mode?: TransportMode;
  lut_no?: string;
  lut_date?: Dayjs;
  tax_details?: string;

  consignee_partner_id?: number | null;
  consignee_name?: string;
  consignee_address?: string;
  consignee_country?: string;
  consignee_contact_person?: string;
  consignee_phone?: string;
  consignee_email?: string;
  consignee_registration_no?: string;

  notify_party_name?: string;
  notify_party_address?: string;

  port_of_loading?: string;
  port_of_discharge?: string;
  loading_destination?: string;
  final_destination?: string;
  country_of_destination?: string;
  payment_terms?: string;

  discount?: number;
  shipping?: number;
  freight_charge?: number;
  packaging_charge?: number;
  development_charge?: number;
  terms_and_conditions?: string;
  notes?: string;
}

const INCOTERMS: Incoterm[] = ['FOB', 'CIF', 'EXW', 'CFR', 'DAP', 'DDP'];
const TRANSPORT_MODES: Array<{ value: TransportMode; label: string }> = [
  { value: 'air', label: 'BY AIR' },
  { value: 'sea', label: 'BY SEA' },
  { value: 'road', label: 'BY ROAD' },
  { value: 'rail', label: 'BY RAIL' },
  { value: 'multimodal', label: 'MULTIMODAL' },
  { value: 'other', label: 'OTHER' },
];
const COUNTRY_OPTIONS = [
  'IN','US','GB','AE','SG','AU','CA','DE','FR','NL','IT','ES','JP','CN','HK','KR','BD','LK','NP','BR','MX','ZA','KE','NG','EG','SA','QA','KW','OM','TH','MY','ID','PH','VN','RO','XX',
].map((c) => ({ value: c, label: c }));
const CURRENCY_OPTIONS = ['INR','USD','EUR','GBP','AED','JPY','CNY','AUD','CAD','SGD'].map((c) => ({ value: c, label: c }));
const TAX_TYPE_OPTIONS: Array<{ value: 'cgst_sgst' | 'igst' | 'none'; label: string }> = [
  { value: 'igst',      label: 'IGST (export with payment of IGST)' },
  { value: 'none',      label: 'None (LUT / zero-rated)' },
  { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
];

export default function ExportInvoiceFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromSoId = params.get('from_so');
  const [form] = Form.useForm<HeaderShape>();
  const [ei, setEi] = useState<ExportInvoice | null>(null);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);
  const [consigneeLabel, setConsigneeLabel] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [prefilledFrom, setPrefilledFrom] = useState<{ id: number; code: string } | null>(null);

  const DEFAULT_BILLTO_CODE = 'BILLTO-ORDER';

  const watchedTaxType = (Form.useWatch('tax_type', form) as 'cgst_sgst' | 'igst' | 'none' | undefined) ?? 'igst';
  const watchedCurrency = Form.useWatch('currency', form) as string | undefined;
  const watchedDiscount = Number(Form.useWatch('discount', form) ?? 0);
  const watchedShipping = Number(Form.useWatch('shipping', form) ?? 0);
  const watchedFreight = Number(Form.useWatch('freight_charge', form) ?? 0);
  const watchedPackaging = Number(Form.useWatch('packaging_charge', form) ?? 0);
  const watchedDevelopment = Number(Form.useWatch('development_charge', form) ?? 0);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    exportInvoiceApi.get(Number(id)).then((x) => {
      setEi(x);
      form.setFieldsValue({
        code: x.code,
        partner_id: x.partner_id,
        invoice_date: dayjs(x.invoice_date),
        date_of_supply: x.date_of_supply ? dayjs(x.date_of_supply) : undefined,
        due_date: x.due_date ? dayjs(x.due_date) : undefined,
        reference: x.reference ?? undefined,
        currency: x.currency,
        tax_type: x.tax_type ?? 'igst',
        incoterm: x.incoterm,
        transport_mode: (x.transport_mode ?? undefined) as TransportMode | undefined,
        lut_no: x.lut_no ?? undefined,
        lut_date: x.lut_date ? dayjs(x.lut_date) : undefined,
        tax_details: x.tax_details ?? undefined,
        consignee_partner_id: x.consignee_partner_id ?? null,
        consignee_name: x.consignee_name ?? undefined,
        consignee_address: x.consignee_address ?? undefined,
        consignee_country: x.consignee_country ?? undefined,
        consignee_contact_person: x.consignee_contact_person ?? undefined,
        consignee_phone: x.consignee_phone ?? undefined,
        consignee_email: x.consignee_email ?? undefined,
        consignee_registration_no: x.consignee_registration_no ?? undefined,
        notify_party_name: x.notify_party_name ?? undefined,
        notify_party_address: x.notify_party_address ?? undefined,
        port_of_loading: x.port_of_loading ?? undefined,
        port_of_discharge: x.port_of_discharge ?? undefined,
        loading_destination: x.loading_destination ?? undefined,
        final_destination: x.final_destination ?? undefined,
        country_of_destination: x.country_of_destination ?? undefined,
        payment_terms: x.payment_terms ?? undefined,
        discount: x.discount, shipping: x.shipping,
        freight_charge: x.freight_charge ?? 0,
        packaging_charge: x.packaging_charge ?? 0,
        development_charge: x.development_charge ?? 0,
        terms_and_conditions: x.terms_and_conditions ?? undefined,
        notes: x.notes ?? undefined,
      });
      setLines((x.lines ?? []).map((l, i) => recalcLine({
        key: `e-${l.id ?? i}`, product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty),
        shipper_qty: l.shipper_qty != null ? Number(l.shipper_qty) : undefined,
        shipper_unit: l.shipper_unit ?? undefined,
        rate: Number(l.rate), tax_rate: Number(l.tax_rate),
        batch_no: l.batch_no ?? undefined,
        expiry_date: l.expiry_date ?? undefined,
        notes: l.notes ?? undefined,
      })));
      if (x.partner) setPartnerLabel(`${x.partner.code} — ${x.partner.name}`);
      if (x.consignee) setConsigneeLabel(`${x.consignee.code} — ${x.consignee.name}`);
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  // Default Bill To = "Z TO ORDER AND NA" (system-seeded partner BILLTO-ORDER).
  // Only fires for brand-new EIs that aren't being prefilled from a Sales Order.
  useEffect(() => {
    if (editing) return;
    if (fromSoId) return;
    (async () => {
      try {
        const list = await partnerApi.lookup(DEFAULT_BILLTO_CODE, 'client', 5);
        const match = list.find((p) => String(p.code).toUpperCase() === DEFAULT_BILLTO_CODE);
        if (!match) return;
        if (!form.getFieldValue('partner_id')) {
          form.setFieldValue('partner_id', Number(match.id));
          setPartnerLabel(`${match.code} — ${match.name}`);
        }
      } catch { /* ignore — fall back to empty default */ }
    })();
  }, [editing, fromSoId, form]);

  // Prefill from SO
  useEffect(() => {
    if (editing) return;
    if (!fromSoId) return;
    (async () => {
      try {
        const so = await salesOrderApi.get(Number(fromSoId));
        form.setFieldsValue({
          partner_id: so.partner_id,
          invoice_date: dayjs(),
          reference: so.reference ?? undefined,
        });
        if (so.partner) setPartnerLabel(`${so.partner.code} — ${so.partner.name}`);
        setLines((so.lines ?? []).map((l, i) => recalcLine({
          key: `from-${l.id ?? i}`,
          product_id: l.product_id,
          product_code: l.product?.code, product_name: l.product?.name,
          hsn_code: l.hsn_code ?? undefined,
          qty: Number(l.qty), rate: Number(l.rate), tax_rate: Number(l.tax_rate),
          notes: l.notes ?? undefined,
        })));
        setPrefilledFrom({ id: so.id, code: so.code });
      } catch { message.error('Could not prefill from SO.'); }
    })();
  }, [editing, fromSoId, form]);

  const onPickConsignee = async (val: number | undefined) => {
    if (!val) return;
    try {
      const p = await partnerApi.get(val);
      setConsigneeLabel(`${p.code} — ${p.name}`);
      form.setFieldsValue({
        consignee_name: p.name,
        consignee_country: p.country ?? undefined,
        consignee_email: p.email ?? undefined,
        consignee_phone: p.phone ?? p.mobile ?? undefined,
      });
    } catch { /* ignore */ }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        partner_id: v.partner_id,
        invoice_date: v.invoice_date.format('YYYY-MM-DD'),
        date_of_supply: v.date_of_supply?.format('YYYY-MM-DD'),
        due_date: v.due_date?.format('YYYY-MM-DD'),
        reference: v.reference,
        currency: v.currency, exchange_rate: 1,
        tax_type: v.tax_type ?? 'igst',
        incoterm: v.incoterm,
        transport_mode: v.transport_mode,
        lut_no: v.lut_no,
        lut_date: v.lut_date?.format('YYYY-MM-DD'),
        tax_details: v.tax_details,
        consignee_partner_id: v.consignee_partner_id ?? null,
        consignee_name: v.consignee_name,
        consignee_address: v.consignee_address,
        consignee_country: v.consignee_country,
        consignee_contact_person: v.consignee_contact_person,
        consignee_phone: v.consignee_phone,
        consignee_email: v.consignee_email,
        consignee_registration_no: v.consignee_registration_no,
        notify_party_name: v.notify_party_name,
        notify_party_address: v.notify_party_address,
        port_of_loading: v.port_of_loading,
        port_of_discharge: v.port_of_discharge,
        loading_destination: v.loading_destination,
        final_destination: v.final_destination,
        country_of_destination: v.country_of_destination,
        payment_terms: v.payment_terms,
        discount: v.discount ?? 0, shipping: v.shipping ?? 0,
        freight_charge: v.freight_charge ?? 0,
        packaging_charge: v.packaging_charge ?? 0,
        development_charge: v.development_charge ?? 0,
        terms_and_conditions: v.terms_and_conditions, notes: v.notes,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!, hsn_code: l.hsn_code,
          qty: l.qty,
          shipper_qty: l.shipper_qty ?? null,
          shipper_unit: l.shipper_unit,
          rate: l.rate, tax_rate: l.tax_rate,
          batch_no: l.batch_no, expiry_date: l.expiry_date, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && ei) { await exportInvoiceApi.update(ei.id, payload); message.success('Saved.'); }
      else {
        const created = await exportInvoiceApi.create(payload);
        message.success('Export invoice created.');
        navigate(`/export-invoices/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onPost = async () => { if (!ei) return; try { setEi(await exportInvoiceApi.post(ei.id)); message.success('Posted.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Post failed.'); } };
  const onCancel = async () => { if (!ei) return; try { setEi(await exportInvoiceApi.cancel(ei.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };
  const onGenerateCompanion = async () => { if (!ei) return; try { setEi(await exportInvoiceApi.ensureCompanionDocs(ei.id)); message.success('Companion documents ready.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Generation failed.'); } };

  const status: ExportInvoiceStatus | undefined = ei?.status;
  const readOnly = !!status && status !== 'draft';

  // Live preview totals (without server roundtrip)
  const linesTotals = totalsOf(lines, watchedTaxType);
  const previewTotal = linesTotals.subtotal + linesTotals.tax_amount + watchedShipping + watchedFreight + watchedPackaging + watchedDevelopment - watchedDiscount;
  const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const totalShipperQty = lines.reduce((s, l) => s + (Number(l.shipper_qty) || 0), 0);

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Export invoice ${ei?.code ?? ''}` : 'New export invoice'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/export-invoices')}>Back</Button>
            {editing && ei && <DownloadPdfButton url={`/export-invoices/${ei.id}/pdf`} filename={`export-invoice-${ei.code}.pdf`} />}
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && ei && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Post this export invoice?', content: 'Locks the invoice. Goods leave on Shipping Bill dispatch.', okText: 'Yes, post', danger: false, onOk: onPost })}>Post</Button>}
            {(status === 'posted' || status === 'partially_paid') && ei && (
              <Button type="primary" icon={<ExperimentOutlined />} onClick={() => navigate(`/shipping-bills/new?from_ei=${ei.id}`)}>New shipping bill</Button>
            )}
            {status && status !== 'cancelled' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this export invoice?', content: 'Cancel all live shipping bills first.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {prefilledFrom && (
          <Alert type="info" showIcon message={<span>Prefilled from sales order <Link to={`/sales-orders/${prefilledFrom.id}`}>{prefilledFrom.code}</Link>.</span>} />
        )}
        {ei?.sales_order_id && !prefilledFrom && (
          <Alert type="info" showIcon message={<span>Linked to sales order <Link to={`/sales-orders/${ei.sales_order_id}`}>SO #{ei.sales_order_id}</Link>.</span>} />
        )}
        {status === 'paid' && <Alert type="success" showIcon message="Fully paid (via IRMs)." />}
        {status === 'cancelled' && <Alert type="error" showIcon message={`Cancelled. ${ei?.cancellation_reason ?? ''}`} />}
        {(status === 'posted' || status === 'partially_paid') && ei && (
          <Alert type="info" showIcon message={
            <span>
              Open balance: <strong>{ei.currency} {Number(ei.balance).toFixed(2)}</strong>.
              {' '}<Link to={`/irms/new?from_ei=${ei.id}`}>Record an IRM</Link> when foreign payment lands.
            </span>
          } />
        )}

        <Form form={form} layout="vertical" initialValues={{
          invoice_date: dayjs(), currency: 'USD', incoterm: 'FOB',
          tax_type: 'igst', transport_mode: 'air',
          discount: 0, shipping: 0, freight_charge: 0, packaging_charge: 0, development_charge: 0,
        }}>
          <Divider orientation="left" plain>Bill To & Dates</Divider>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Export Invoice #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="export_invoice" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                label="Bill to (client)"
                name="partner_id"
                rules={[{ required: true }]}
                extra={!editing ? <Typography.Text type="secondary">Defaults to "Z TO ORDER AND NA" — search to pick a specific buyer.</Typography.Text> : undefined}
              >
                <PartnerSmartDropdown
                  type="client"
                  placeholder="Search client..."
                  allowClear
                  disabled={readOnly}
                  fallbackLabel={partnerLabel}
                  onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}><Form.Item label="Invoice date" name="invoice_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Date of supply" name="date_of_supply"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Due date" name="due_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Reference" name="reference"><Input disabled={readOnly} /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Currency & Tax</Divider>
          <Row gutter={16}>
            <Col xs={12} md={3}><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><Select options={CURRENCY_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Tax type" name="tax_type" rules={[{ required: true }]}><Select options={TAX_TYPE_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Incoterm" name="incoterm" rules={[{ required: true }]}><Select disabled={readOnly} options={INCOTERMS.map((i) => ({ value: i, label: i }))} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Transport mode" name="transport_mode"><Select options={TRANSPORT_MODES} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="LUT no." name="lut_no"><Input disabled={readOnly} placeholder="e.g. AD2404260012530" /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="LUT date" name="lut_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Tax details (descriptive)" name="tax_details"><Input disabled={readOnly} placeholder="e.g. EXPORT WITH IGST UNDER LUT" /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Consignee (Ship To / Notify Client 1)</Divider>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Pick from CRM (optional)" name="consignee_partner_id">
                <PartnerSmartDropdown
                  placeholder="Search partner..."
                  allowClear
                  disabled={readOnly}
                  fallbackLabel={consigneeLabel}
                  onPartnerSelect={(p) => { if (p?.id) void onPickConsignee(Number(p.id)); }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}><Form.Item label="Consignee name" name="consignee_name"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Country" name="consignee_country"><Select showSearch options={COUNTRY_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Phone" name="consignee_phone"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Address" name="consignee_address"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Contact person" name="consignee_contact_person"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Email" name="consignee_email" rules={[{ type: 'email' }]}><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Registration no. (EUID, etc.)" name="consignee_registration_no"><Input disabled={readOnly} /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Notify Party 2</Divider>
          <Row gutter={16}>
            <Col xs={24} md={10}><Form.Item label="Notify party name" name="notify_party_name"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={14}><Form.Item label="Notify party address" name="notify_party_address"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Logistics & Payment</Divider>
          <Row gutter={16}>
            <Col xs={12} md={6}><Form.Item label="Port of loading" name="port_of_loading"><Input disabled={readOnly} placeholder="e.g. Ahmedabad Airport" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Port of discharge" name="port_of_discharge"><Input disabled={readOnly} placeholder="e.g. Bucharest Airport" /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Loading destination" name="loading_destination"><Input disabled={readOnly} placeholder="INDIA" /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Final destination" name="final_destination"><Input disabled={readOnly} placeholder="ROMANIA" /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Country of destination" name="country_of_destination"><Input disabled={readOnly} placeholder="e.g. ROMANIA" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Payment terms" name="payment_terms"><Input disabled={readOnly} placeholder="e.g. 100% advance against delivery" /></Form.Item></Col>
          </Row>
        </Form>

        <Divider orientation="left" plain>Lines</Divider>
        <DocumentLineEditor lines={lines} onChange={setLines} readOnly={readOnly} showBatch showShipper hideTax productTypeFilter="finished" taxType={watchedTaxType} currency={watchedCurrency} />

        <Divider orientation="left" plain>Charges</Divider>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={12} md={4}><Form.Item label="Discount" name="discount"><InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Ocean / Air freight" name="freight_charge"><InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Packaging charge" name="packaging_charge"><InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Development charge" name="development_charge"><InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Other shipping" name="shipping"><InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Terms & conditions" name="terms_and_conditions"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        <Card size="small" style={{ background: '#fafafa' }}>
          <Row gutter={[16, 8]}>
            <Col xs={12} md={6}><Typography.Text type="secondary">Total qty</Typography.Text><br /><strong>{totalQty.toFixed(3)}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Total packages (shipper)</Typography.Text><br /><strong>{totalShipperQty}</strong></Col>
            <Col xs={12} md={12}><Typography.Text type="secondary">Subtotal</Typography.Text><br /><strong>{watchedCurrency} {linesTotals.subtotal.toFixed(2)}</strong></Col>
            <Col xs={24}><Divider style={{ margin: '8px 0' }} /></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Freight</Typography.Text><br />{watchedCurrency} {watchedFreight.toFixed(2)}</Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Packaging</Typography.Text><br />{watchedCurrency} {watchedPackaging.toFixed(2)}</Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Development</Typography.Text><br />{watchedCurrency} {watchedDevelopment.toFixed(2)}</Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Discount</Typography.Text><br />− {watchedCurrency} {watchedDiscount.toFixed(2)}</Col>
            <Col xs={24}><Divider style={{ margin: '8px 0' }} /></Col>
            <Col xs={24}><Typography.Text strong style={{ fontSize: 16 }}>TOTAL INVOICE VALUE: </Typography.Text><Typography.Text strong style={{ fontSize: 18 }}>{watchedCurrency} {previewTotal.toFixed(2)}</Typography.Text></Col>
          </Row>
        </Card>

        {ei && (
          <Card size="small" title={
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <span>Companion documents (auto-generated for customs + GST)</span>
              <Button size="small" onClick={onGenerateCompanion}>Re-generate missing</Button>
            </Space>
          }>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Typography.Text strong>Packing list (for customs)</Typography.Text>
                {ei.packing_lists && ei.packing_lists.length > 0 ? (
                  <Table
                    rowKey="id" size="small" pagination={false}
                    dataSource={ei.packing_lists}
                    columns={[
                      { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/packing-lists/${r.id}/edit`}><Tag>{c}</Tag></Link> },
                      { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <Tag color={s === 'finalized' ? 'green' : s === 'cancelled' ? 'red' : 'default'}>{s}</Tag> },
                      { title: 'Date', dataIndex: 'pl_date', width: 110 },
                    ]}
                  />
                ) : (
                  <Alert type="warning" showIcon style={{ marginTop: 8 }} message="No packing list yet." action={<Button size="small" onClick={onGenerateCompanion}>Generate</Button>} />
                )}
              </Col>
              <Col xs={24} md={12}>
                <Typography.Text strong>Tax invoice (for GST)</Typography.Text>
                {ei.tax_invoices && ei.tax_invoices.length > 0 ? (
                  <Table
                    rowKey="id" size="small" pagination={false}
                    dataSource={ei.tax_invoices}
                    columns={[
                      { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/tax-invoices/${r.id}/edit`}><Tag>{c}</Tag></Link> },
                      { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <Tag color={s === 'posted' ? 'green' : s === 'cancelled' ? 'red' : 'default'}>{s}</Tag> },
                      { title: 'Date', dataIndex: 'invoice_date', width: 110 },
                      { title: 'Total (₹)', dataIndex: 'total_inr', align: 'right', render: (v: number) => `₹ ${(Number(v) || 0).toFixed(2)}` },
                    ]}
                  />
                ) : (
                  <Alert type="warning" showIcon style={{ marginTop: 8 }} message="No tax invoice yet." action={<Button size="small" onClick={onGenerateCompanion}>Generate</Button>} />
                )}
              </Col>
            </Row>
          </Card>
        )}

        {ei && ei.shipping_bills && ei.shipping_bills.length > 0 && (
          <Card size="small" title={`Shipping bills (${ei.shipping_bills.length})`}>
            <Table
              rowKey="id"
              dataSource={ei.shipping_bills}
              size="small"
              pagination={false}
              columns={[
                { title: 'Code', dataIndex: 'code', width: 150, render: (c: string, r) => <Link to={`/shipping-bills/${r.id}`}><Tag>{c}</Tag></Link> },
                { title: 'Status', dataIndex: 'status', width: 120, render: (s: string) => <Tag>{s}</Tag> },
                { title: 'BL no.', dataIndex: 'bl_no', width: 140 },
                { title: 'BL date', dataIndex: 'bl_date', width: 110 },
                { title: 'Dispatched', dataIndex: 'dispatched_at', width: 170, render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
              ]}
            />
          </Card>
        )}
      </Space>
    </Card>
  );
}
