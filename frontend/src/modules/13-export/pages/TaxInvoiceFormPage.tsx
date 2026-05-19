import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Descriptions, Divider, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { exportInvoiceApi, taxInvoiceApi } from '../api/exportApi';
import { partnerApi } from '../../04-crm/api/partnerApi';
import { useAppSelector } from '../../../app/hooks';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import type { TaxInvoice, TaxInvoiceStatus, TaxInvoiceTaxType } from '../types/taxInvoice.types';
import type { ExportInvoice, Incoterm, TransportMode } from '../types/export.types';

interface SnapLine {
  key: string;
  product_id: number;
  product_code?: string;
  product_name?: string;
  hsn_code?: string | null;
  qty: number;
  shipper_qty?: number | null;
  shipper_unit?: string | null;
  rate_ccy: number;        // original EI rate in foreign currency
  tax_rate: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  export_invoice_item_id?: number | null;
}

interface HeaderShape {
  code?: string;
  export_invoice_id: number;

  // ★ The 3 fields the user actually fills in
  exchange_rate: number;
  customs_notification_no?: string;
  customs_notification_date?: Dayjs;

  // TI's own date (defaults to today)
  invoice_date: Dayjs;
  reference?: string;
  notes?: string;

  // Auto-snapped from EI / company / partner — visible but locked
  partner_id: number;
  currency: string;          // EI's CCY (USD etc.) — used for INR conversion only
  date_of_supply?: Dayjs;
  transport_mode?: TransportMode;
  incoterm?: Incoterm;
  lut_no?: string;
  lut_date?: Dayjs;
  tax_details?: string;
  gstin_supplier?: string;
  gstin_recipient?: string;
  place_of_supply?: string;
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
  payment_terms?: string;
  tax_type: TaxInvoiceTaxType;

  // Charges from EI (in CCY, will be converted to INR for display & storage)
  discount?: number;
  shipping?: number;
  freight_charge?: number;
  packaging_charge?: number;
  development_charge?: number;
}

export default function TaxInvoiceFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromEi = params.get('from_ei');

  const [form] = Form.useForm<HeaderShape>();
  const [ti, setTI] = useState<TaxInvoice | null>(null);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [eiOpts, setEiOpts] = useState<Array<{ value: number; label: string }>>([]);
  const [partnerLabel, setPartnerLabel] = useState<string>('');
  const [consigneeBlock, setConsigneeBlock] = useState<{ name?: string; address?: string; country?: string; contact?: string; phone?: string; email?: string; reg?: string } | null>(null);
  const [notifyBlock, setNotifyBlock] = useState<{ name?: string; address?: string } | null>(null);
  const [linkedEi, setLinkedEi] = useState<{ id: number; code: string } | null>(null);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);

  const activeCompany = useAppSelector((s) => {
    const id = s.companies.activeCompanyId;
    return id ? s.companies.list.find((c) => c.id === id) ?? null : null;
  });

  const watchedXrate = Number(Form.useWatch('exchange_rate', form) ?? 0);
  const watchedCcy = Form.useWatch('currency', form) as string | undefined;

  const inrLines = useMemo(() => snapLines.map((l) => {
    const rateInr = (l.rate_ccy || 0) * (watchedXrate || 0);
    const subInr = rateInr * (l.qty || 0);
    return { ...l, rate_inr: rateInr, line_subtotal_inr: subInr };
  }), [snapLines, watchedXrate]);

  const lineSubtotalCcy = snapLines.reduce((s, l) => s + (l.rate_ccy || 0) * (l.qty || 0), 0);
  const lineSubtotalInr = lineSubtotalCcy * (watchedXrate || 0);

  const watchedDiscount = Number(Form.useWatch('discount', form) ?? 0);
  const watchedShipping = Number(Form.useWatch('shipping', form) ?? 0);
  const watchedFreight = Number(Form.useWatch('freight_charge', form) ?? 0);
  const watchedPackaging = Number(Form.useWatch('packaging_charge', form) ?? 0);
  const watchedDevelopment = Number(Form.useWatch('development_charge', form) ?? 0);
  const extraInr = (watchedShipping + watchedFreight + watchedPackaging + watchedDevelopment - watchedDiscount) * (watchedXrate || 0);
  const totalInr = lineSubtotalInr + extraInr;
  const totalQty = snapLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const totalShipperQty = snapLines.reduce((s, l) => s + (Number(l.shipper_qty) || 0), 0);

  // === Load existing TI ===
  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    taxInvoiceApi.get(Number(id)).then((x) => {
      setTI(x);
      form.setFieldsValue({
        code: x.code,
        export_invoice_id: x.export_invoice_id,
        partner_id: x.partner_id,
        invoice_date: dayjs(x.invoice_date),
        date_of_supply: x.date_of_supply ? dayjs(x.date_of_supply) : undefined,
        reference: x.reference ?? undefined,
        currency: x.currency,
        exchange_rate: x.exchange_rate,
        transport_mode: (x.transport_mode ?? undefined) as TransportMode | undefined,
        incoterm: (x.incoterm ?? undefined) as Incoterm | undefined,
        lut_no: x.lut_no ?? undefined,
        lut_date: x.lut_date ? dayjs(x.lut_date) : undefined,
        tax_details: x.tax_details ?? undefined,
        customs_notification_no: x.customs_notification_no ?? undefined,
        customs_notification_date: x.customs_notification_date ? dayjs(x.customs_notification_date) : undefined,
        gstin_supplier: x.gstin_supplier ?? undefined,
        gstin_recipient: x.gstin_recipient ?? undefined,
        place_of_supply: x.place_of_supply ?? undefined,
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
        payment_terms: x.payment_terms ?? undefined,
        tax_type: x.tax_type,
        discount: x.discount, shipping: x.shipping,
        freight_charge: x.freight_charge ?? 0,
        packaging_charge: x.packaging_charge ?? 0,
        development_charge: x.development_charge ?? 0,
        notes: x.notes ?? undefined,
      });
      if (x.export_invoice) { setEiOpts([{ value: x.export_invoice.id, label: x.export_invoice.code }]); setLinkedEi({ id: x.export_invoice.id, code: x.export_invoice.code }); }
      if (x.partner) setPartnerLabel(`${x.partner.code} — ${x.partner.name}`);
      setConsigneeBlock({ name: x.consignee_name ?? undefined, address: x.consignee_address ?? undefined, country: x.consignee_country ?? undefined, contact: x.consignee_contact_person ?? undefined, phone: x.consignee_phone ?? undefined, email: x.consignee_email ?? undefined, reg: x.consignee_registration_no ?? undefined });
      setNotifyBlock({ name: x.notify_party_name ?? undefined, address: x.notify_party_address ?? undefined });
      setSnapLines((x.lines ?? []).map((l, i) => ({
        key: `e-${l.id ?? i}`,
        export_invoice_item_id: l.export_invoice_item_id ?? null,
        product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty),
        shipper_qty: l.shipper_qty != null ? Number(l.shipper_qty) : undefined,
        shipper_unit: l.shipper_unit ?? undefined,
        rate_ccy: Number(l.rate),
        tax_rate: Number(l.tax_rate),
        batch_no: l.batch_no ?? undefined,
        expiry_date: l.expiry_date ?? undefined,
        notes: l.notes ?? undefined,
      })));
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  // === Snapshot from EI (the heart of the form) ===
  const snapshotFromEi = async (ei: ExportInvoice) => {
    // Try to load the full partner so we can pull GSTIN / state
    let partnerGst: string | undefined;
    let partnerState: string | undefined;
    if (ei.partner_id) {
      try {
        const p = await partnerApi.get(ei.partner_id);
        partnerGst = p.gst_no ?? undefined;
        // place_of_supply would ideally come from address; partner doesn't carry it directly
        void partnerState;
      } catch { /* ignore */ }
    }

    form.setFieldsValue({
      export_invoice_id: ei.id,
      partner_id: ei.partner_id,
      invoice_date: dayjs(),
      date_of_supply: ei.date_of_supply ? dayjs(ei.date_of_supply) : (ei.invoice_date ? dayjs(ei.invoice_date) : undefined),
      currency: ei.currency,
      // exchange_rate stays whatever the user types — start with EI's value if present (else 1)
      exchange_rate: ei.exchange_rate || 1,
      transport_mode: (ei.transport_mode ?? undefined) as TransportMode | undefined,
      incoterm: ei.incoterm,
      lut_no: ei.lut_no ?? undefined,
      lut_date: ei.lut_date ? dayjs(ei.lut_date) : undefined,
      tax_details: ei.tax_details ?? undefined,
      gstin_supplier: activeCompany?.gst_no ?? undefined,
      gstin_recipient: partnerGst,
      consignee_partner_id: ei.consignee_partner_id ?? null,
      consignee_name: ei.consignee_name ?? undefined,
      consignee_address: ei.consignee_address ?? undefined,
      consignee_country: ei.consignee_country ?? undefined,
      consignee_contact_person: ei.consignee_contact_person ?? undefined,
      consignee_phone: ei.consignee_phone ?? undefined,
      consignee_email: ei.consignee_email ?? undefined,
      consignee_registration_no: ei.consignee_registration_no ?? undefined,
      notify_party_name: ei.notify_party_name ?? undefined,
      notify_party_address: ei.notify_party_address ?? undefined,
      port_of_loading: ei.port_of_loading ?? undefined,
      port_of_discharge: ei.port_of_discharge ?? undefined,
      loading_destination: ei.loading_destination ?? undefined,
      final_destination: ei.final_destination ?? undefined,
      payment_terms: ei.payment_terms ?? undefined,
      discount: ei.discount, shipping: ei.shipping,
      freight_charge: ei.freight_charge ?? 0,
      packaging_charge: ei.packaging_charge ?? 0,
      development_charge: ei.development_charge ?? 0,
      tax_type: (ei.tax_type ?? 'igst') as TaxInvoiceTaxType,
    });
    setEiOpts([{ value: ei.id, label: ei.code }]);
    setLinkedEi({ id: ei.id, code: ei.code });
    if (ei.partner) setPartnerLabel(`${ei.partner.code} — ${ei.partner.name}`);
    setConsigneeBlock({
      name: ei.consignee_name ?? undefined, address: ei.consignee_address ?? undefined, country: ei.consignee_country ?? undefined,
      contact: ei.consignee_contact_person ?? undefined, phone: ei.consignee_phone ?? undefined, email: ei.consignee_email ?? undefined,
      reg: ei.consignee_registration_no ?? undefined,
    });
    setNotifyBlock({ name: ei.notify_party_name ?? undefined, address: ei.notify_party_address ?? undefined });
    setSnapLines((ei.lines ?? []).map((l, i) => ({
      key: `from-${l.id ?? i}`,
      export_invoice_item_id: l.id ?? null,
      product_id: l.product_id,
      product_code: l.product?.code, product_name: l.product?.name,
      hsn_code: l.hsn_code ?? undefined,
      qty: Number(l.qty),
      shipper_qty: l.shipper_qty != null ? Number(l.shipper_qty) : undefined,
      shipper_unit: l.shipper_unit ?? undefined,
      rate_ccy: Number(l.rate),
      tax_rate: Number(l.tax_rate ?? 0),
      batch_no: l.batch_no ?? undefined,
      expiry_date: l.expiry_date ?? undefined,
    })));
  };

  // Auto-prefill from ?from_ei=
  useEffect(() => {
    if (editing) return;
    if (!fromEi) return;
    (async () => {
      try {
        const ei = await exportInvoiceApi.get(Number(fromEi));
        await snapshotFromEi(ei);
      } catch { message.error('Could not prefill from export invoice.'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, fromEi]);

  // EI search / pick
  const onSearchEi = async (q: string) => {
    if (!q) return;
    try {
      const r = await exportInvoiceApi.list({ search: q, per_page: 20 });
      setEiOpts(r.data.map((e) => ({ value: e.id, label: `${e.code}${e.partner ? ' — ' + e.partner.name : ''}` })));
    } catch { /* ignore */ }
  };
  const onPickEi = async (eiId: number | null) => {
    if (!eiId) return;
    try {
      const ei = await exportInvoiceApi.get(eiId);
      await snapshotFromEi(ei);
    } catch { message.error('Failed to fetch export invoice.'); }
  };
  const onResnap = async () => {
    if (!linkedEi) { message.warning('Pick an export invoice first.'); return; }
    try {
      const ei = await exportInvoiceApi.get(linkedEi.id);
      await snapshotFromEi(ei);
      message.success('Re-synced from export invoice.');
    } catch { message.error('Sync failed.'); }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        export_invoice_id: v.export_invoice_id,
        partner_id: v.partner_id,
        invoice_date: v.invoice_date.format('YYYY-MM-DD'),
        date_of_supply: v.date_of_supply?.format('YYYY-MM-DD'),
        reference: v.reference,
        currency: v.currency,
        exchange_rate: v.exchange_rate,
        transport_mode: v.transport_mode,
        incoterm: v.incoterm,
        lut_no: v.lut_no,
        lut_date: v.lut_date?.format('YYYY-MM-DD'),
        tax_details: v.tax_details,
        customs_notification_no: v.customs_notification_no,
        customs_notification_date: v.customs_notification_date?.format('YYYY-MM-DD'),
        gstin_supplier: v.gstin_supplier,
        gstin_recipient: v.gstin_recipient,
        place_of_supply: v.place_of_supply,
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
        payment_terms: v.payment_terms,
        tax_type: v.tax_type,
        discount: v.discount ?? 0, shipping: v.shipping ?? 0,
        freight_charge: v.freight_charge ?? 0,
        packaging_charge: v.packaging_charge ?? 0,
        development_charge: v.development_charge ?? 0,
        notes: v.notes,
        lines: snapLines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          export_invoice_item_id: l.export_invoice_item_id ?? null,
          product_id: l.product_id, hsn_code: l.hsn_code,
          qty: l.qty,
          shipper_qty: l.shipper_qty ?? null,
          shipper_unit: l.shipper_unit,
          rate: l.rate_ccy, tax_rate: l.tax_rate, discount_pct: 0,
          batch_no: l.batch_no, expiry_date: l.expiry_date, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Pick an export invoice with at least one line first.'); return; }
      if (editing && ti) { await taxInvoiceApi.update(ti.id, payload); message.success('Saved.'); }
      else {
        const created = await taxInvoiceApi.create(payload);
        message.success('Tax invoice created.');
        navigate(`/tax-invoices/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onPost   = async () => { if (!ti) return; try { setTI(await taxInvoiceApi.post(ti.id)); message.success('Posted.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Post failed.'); } };
  const onCancel = async () => { if (!ti) return; try { setTI(await taxInvoiceApi.cancel(ti.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const status: TaxInvoiceStatus | undefined = ti?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space direction="vertical" size={0}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {linkedEi ? <>Tax invoice for <Link to={`/export-invoices/${linkedEi.id}`}>{linkedEi.code}</Link></> : 'New tax invoice'}
              {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}
            </Typography.Title>
            {ti?.code && <Typography.Text type="secondary">Internal ref: {ti.code}</Typography.Text>}
          </Space>
          <Space>
            <Button onClick={() => navigate('/tax-invoices')}>Back</Button>
            {editing && ti && <DownloadPdfButton url={`/tax-invoices/${ti.id}/pdf`} filename={`tax-invoice-${ti.code}.pdf`} />}
            {!readOnly && linkedEi && <Button icon={<ReloadOutlined />} onClick={onResnap}>Re-sync from EI</Button>}
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && ti && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Post this tax invoice?', okText: 'Yes, post', danger: false, onOk: onPost })}>Post</Button>}
            {status && status !== 'cancelled' && ti && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this tax invoice?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>

        <Alert type="info" showIcon message={
          linkedEi
            ? <span>This tax invoice mirrors export invoice <Link to={`/export-invoices/${linkedEi.id}`}><strong>{linkedEi.code}</strong></Link>. Fill the <strong>exchange rate</strong> + <strong>customs notification</strong> below; everything else is auto-pulled from the export invoice. All amounts shown in <strong>₹ INR</strong>.</span>
            : <span>Pick the export invoice below — the entire form will auto-fill from it. You only need to enter the exchange rate and customs notification.</span>
        } />

        <Form form={form} layout="vertical" initialValues={{ invoice_date: dayjs(), exchange_rate: 1, tax_type: 'igst', discount: 0, shipping: 0, freight_charge: 0, packaging_charge: 0, development_charge: 0 }}>

          {/* === EI picker === */}
          <Divider orientation="left" plain>Source export invoice</Divider>
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Form.Item label="Tax invoice #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="tax_invoice" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Export invoice" name="export_invoice_id" rules={[{ required: true, message: 'Pick the export invoice you are taxing' }]}>
                <Select
                  showSearch placeholder="Search by code..." filterOption={false}
                  onSearch={(q) => void onSearchEi(q)}
                  onChange={(v: number | null) => void onPickEi(v)}
                  options={eiOpts}
                  disabled={readOnly || editing}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item label="Tax invoice date" name="invoice_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item label="Reference / your note" name="reference"><Input disabled={readOnly} placeholder="optional" /></Form.Item>
            </Col>
          </Row>

          {/* === The 3 ★ user-input fields === */}
          <Divider orientation="left" plain>Required fields (you fill these in)</Divider>
          <Card size="small" style={{ background: '#fffbe6', borderColor: '#ffe58f' }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  label={<><span style={{ color: '#d4380d' }}>★</span> Exchange rate ({watchedCcy ?? 'USD'} → INR)</>}
                  name="exchange_rate"
                  rules={[{ required: true, type: 'number', min: 0.000001, message: 'Required for INR conversion' }]}
                >
                  <InputNumber style={{ width: '100%' }} step={0.0001} disabled={readOnly} placeholder="e.g. 92.5" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item label={<><span style={{ color: '#d4380d' }}>★</span> Customs notification no.</>} name="customs_notification_no" rules={[{ required: true, message: 'Required on tax invoice' }]}>
                  <Input disabled={readOnly} placeholder="e.g. 13/2026" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={<><span style={{ color: '#d4380d' }}>★</span> Customs notification date</>} name="customs_notification_date" rules={[{ required: true, message: 'Required on tax invoice' }]}>
                  <DatePicker style={{ width: '100%' }} disabled={readOnly} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* === GSTIN block (auto-filled, editable for overrides) === */}
          <Divider orientation="left" plain>GST details (auto-filled)</Divider>
          <Row gutter={16}>
            <Col xs={12} md={6}><Form.Item label="Supplier GSTIN" name="gstin_supplier"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Recipient GSTIN" name="gstin_recipient"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Place of supply" name="place_of_supply"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="LUT no." name="lut_no"><Input disabled /></Form.Item></Col>
          </Row>

          {/* Hidden fields — kept in form so they get submitted, but invisible to the user */}
          <Form.Item name="partner_id" hidden><Input /></Form.Item>
          <Form.Item name="currency" hidden><Input /></Form.Item>
          <Form.Item name="date_of_supply" hidden><DatePicker /></Form.Item>
          <Form.Item name="transport_mode" hidden><Input /></Form.Item>
          <Form.Item name="incoterm" hidden><Input /></Form.Item>
          <Form.Item name="lut_date" hidden><DatePicker /></Form.Item>
          <Form.Item name="tax_details" hidden><Input /></Form.Item>
          <Form.Item name="consignee_partner_id" hidden><InputNumber /></Form.Item>
          <Form.Item name="consignee_name" hidden><Input /></Form.Item>
          <Form.Item name="consignee_address" hidden><Input /></Form.Item>
          <Form.Item name="consignee_country" hidden><Input /></Form.Item>
          <Form.Item name="consignee_contact_person" hidden><Input /></Form.Item>
          <Form.Item name="consignee_phone" hidden><Input /></Form.Item>
          <Form.Item name="consignee_email" hidden><Input /></Form.Item>
          <Form.Item name="consignee_registration_no" hidden><Input /></Form.Item>
          <Form.Item name="notify_party_name" hidden><Input /></Form.Item>
          <Form.Item name="notify_party_address" hidden><Input /></Form.Item>
          <Form.Item name="port_of_loading" hidden><Input /></Form.Item>
          <Form.Item name="port_of_discharge" hidden><Input /></Form.Item>
          <Form.Item name="loading_destination" hidden><Input /></Form.Item>
          <Form.Item name="final_destination" hidden><Input /></Form.Item>
          <Form.Item name="payment_terms" hidden><Input /></Form.Item>
          <Form.Item name="tax_type" hidden><Input /></Form.Item>
          <Form.Item name="discount" hidden><InputNumber /></Form.Item>
          <Form.Item name="shipping" hidden><InputNumber /></Form.Item>
          <Form.Item name="freight_charge" hidden><InputNumber /></Form.Item>
          <Form.Item name="packaging_charge" hidden><InputNumber /></Form.Item>
          <Form.Item name="development_charge" hidden><InputNumber /></Form.Item>

          <Divider orientation="left" plain>Notes</Divider>
          <Row gutter={16}>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        {/* === Read-only header preview from EI === */}
        {linkedEi && (
          <>
            <Divider orientation="left" plain>From export invoice (read-only)</Divider>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Bill to">{partnerLabel || '—'}</Descriptions.Item>
              <Descriptions.Item label="Invoice no.">{linkedEi.code}</Descriptions.Item>
              <Descriptions.Item label="Consignee" span={2}>
                {consigneeBlock?.name ? (
                  <Space direction="vertical" size={0}>
                    <strong>{consigneeBlock.name}</strong>
                    {consigneeBlock.address && <Typography.Text>{consigneeBlock.address}</Typography.Text>}
                    {consigneeBlock.country && <Typography.Text type="secondary">Country: {consigneeBlock.country}</Typography.Text>}
                    {consigneeBlock.contact && <Typography.Text type="secondary">Contact: {consigneeBlock.contact}</Typography.Text>}
                    {consigneeBlock.phone && <Typography.Text type="secondary">Phone: {consigneeBlock.phone}</Typography.Text>}
                    {consigneeBlock.email && <Typography.Text type="secondary">Email: {consigneeBlock.email}</Typography.Text>}
                    {consigneeBlock.reg && <Typography.Text type="secondary">Reg: {consigneeBlock.reg}</Typography.Text>}
                  </Space>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Notify party 2" span={2}>
                {notifyBlock?.name ? <Space direction="vertical" size={0}><strong>{notifyBlock.name}</strong>{notifyBlock.address && <Typography.Text>{notifyBlock.address}</Typography.Text>}</Space> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Transport">{(form.getFieldValue('transport_mode') ?? '—').toString().toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="Incoterm">{form.getFieldValue('incoterm') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Port of loading">{form.getFieldValue('port_of_loading') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Port of discharge">{form.getFieldValue('port_of_discharge') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Loading destination">{form.getFieldValue('loading_destination') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Final destination">{form.getFieldValue('final_destination') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Payment terms" span={2}>{form.getFieldValue('payment_terms') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Tax details" span={2}>{form.getFieldValue('tax_details') ?? '—'}</Descriptions.Item>
            </Descriptions>
          </>
        )}

        {/* === Lines (read-only, in INR) === */}
        <Divider orientation="left" plain>Lines (in ₹ INR)</Divider>
        <Table
          rowKey="key"
          dataSource={inrLines}
          size="small"
          pagination={false}
          locale={{ emptyText: linkedEi ? 'Export invoice has no lines.' : 'Pick an export invoice above.' }}
          columns={[
            { title: 'Sr.', key: 'sr', width: 60, render: (_: unknown, _r, idx: number) => idx + 1 },
            { title: 'Product description', key: 'p', render: (_: unknown, r) => r.product_code ? `${r.product_code} — ${r.product_name ?? ''}` : '—' },
            { title: 'HSN code', dataIndex: 'hsn_code', key: 'h', width: 110 },
            { title: 'Qty', dataIndex: 'qty', key: 'q', width: 90, align: 'right', render: (v: number) => Number(v).toFixed(3) },
            { title: 'Shipper', dataIndex: 'shipper_qty', key: 'sq', width: 80, align: 'right', render: (v?: number | null) => v != null ? Number(v).toString() : '—' },
            { title: 'Unit', dataIndex: 'shipper_unit', key: 'su', width: 80 },
            { title: 'Price/Unit (₹)', key: 'r', width: 130, align: 'right', render: (_: unknown, r) => `₹ ${(r.rate_inr ?? 0).toFixed(2)}` },
            { title: 'Amount (₹)', key: 'a', width: 140, align: 'right', render: (_: unknown, r) => <strong>₹ {(r.line_subtotal_inr ?? 0).toFixed(2)}</strong> },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}><strong>TOTAL</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><strong>{totalQty.toFixed(3)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><strong>{totalShipperQty}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
              <Table.Summary.Cell index={4} align="right">—</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><strong>₹ {lineSubtotalInr.toFixed(2)}</strong></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />

        {/* === Totals card (in INR only) === */}
        <Card size="small" style={{ background: '#fafafa' }}>
          <Row gutter={[16, 8]}>
            <Col xs={12} md={6}><Typography.Text type="secondary">TOTAL VALUE</Typography.Text><br /><strong>₹ {lineSubtotalInr.toFixed(2)}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Ocean / Air freight</Typography.Text><br />₹ {(watchedFreight * (watchedXrate || 0)).toFixed(2)}</Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Development charge</Typography.Text><br />₹ {(watchedDevelopment * (watchedXrate || 0)).toFixed(2)}</Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Packaging charge</Typography.Text><br />₹ {(watchedPackaging * (watchedXrate || 0)).toFixed(2)}</Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Other shipping</Typography.Text><br />₹ {(watchedShipping * (watchedXrate || 0)).toFixed(2)}</Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Discount</Typography.Text><br />− ₹ {(watchedDiscount * (watchedXrate || 0)).toFixed(2)}</Col>
            <Col xs={24}><Divider style={{ margin: '8px 0' }} /></Col>
            <Col xs={24}>
              <Typography.Text strong style={{ fontSize: 16 }}>TOTAL INVOICE VALUE: </Typography.Text>
              <Typography.Text strong style={{ fontSize: 22, color: '#cf1322' }}>₹ {totalInr.toFixed(2)}</Typography.Text>
              <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
                ({watchedCcy ?? 'CCY'} {(lineSubtotalCcy + (watchedShipping + watchedFreight + watchedPackaging + watchedDevelopment - watchedDiscount)).toFixed(2)} × {Number(watchedXrate || 0).toFixed(4)})
              </Typography.Text>
            </Col>
          </Row>
        </Card>
      </Space>
    </Card>
  );
}
