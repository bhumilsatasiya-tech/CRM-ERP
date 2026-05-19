import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { exportInvoiceApi, packingListApi } from '../api/exportApi';
import { partnerApi } from '../../04-crm/api/partnerApi';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import type { PackingList, PackingListStatus } from '../types/packingList.types';
import type { ExportInvoice, Incoterm, TransportMode } from '../types/export.types';

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

interface HeaderShape {
  code?: string;
  export_invoice_id: number;
  partner_id?: number | null;
  pl_date: Dayjs;
  invoice_date?: Dayjs;
  date_of_supply?: Dayjs;

  transport_mode?: TransportMode;
  incoterm?: Incoterm;
  lut_no?: string;
  lut_date?: Dayjs;
  tax_details?: string;
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

  marks_and_numbers?: string;
  total_pallet_qty?: number;
  volume_cbm?: number;
  notes?: string;
}

interface PLLineRow {
  key: string;
  id?: number;
  export_invoice_item_id?: number | null;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  hsn_code?: string;
  qty: number;
  packages: number;
  shipper_unit?: string;
  marks?: string;
  gross_weight_kg: number;
  net_weight_kg: number;
  dimensions?: string;
  batch_no?: string;
  notes?: string;
}

export default function PackingListFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromEi = params.get('from_ei');

  const [form] = Form.useForm<HeaderShape>();
  const [pl, setPL] = useState<PackingList | null>(null);
  const [lines, setLines] = useState<PLLineRow[]>([]);
  const [eiOpts, setEiOpts] = useState<Array<{ value: number; label: string }>>([]);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);
  const [consigneeLabel, setConsigneeLabel] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    packingListApi.get(Number(id)).then((x) => {
      setPL(x);
      form.setFieldsValue({
        code: x.code,
        export_invoice_id: x.export_invoice_id,
        partner_id: x.partner_id ?? null,
        pl_date: x.pl_date ? dayjs(x.pl_date) : dayjs(),
        invoice_date: x.invoice_date ? dayjs(x.invoice_date) : undefined,
        date_of_supply: x.date_of_supply ? dayjs(x.date_of_supply) : undefined,
        transport_mode: (x.transport_mode ?? undefined) as TransportMode | undefined,
        incoterm: (x.incoterm ?? undefined) as Incoterm | undefined,
        lut_no: x.lut_no ?? undefined,
        lut_date: x.lut_date ? dayjs(x.lut_date) : undefined,
        tax_details: x.tax_details ?? undefined,
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
        marks_and_numbers: x.marks_and_numbers ?? undefined,
        total_pallet_qty: x.total_pallet_qty ?? 0,
        volume_cbm: x.volume_cbm ?? 0,
        notes: x.notes ?? undefined,
      });
      if (x.export_invoice) setEiOpts([{ value: x.export_invoice.id, label: x.export_invoice.code }]);
      if (x.partner) setPartnerLabel(`${x.partner.code} — ${x.partner.name}`);
      if (x.consignee) setConsigneeLabel(`${x.consignee.code} — ${x.consignee.name}`);
      setLines((x.lines ?? []).map((l, i) => ({
        key: `e-${l.id ?? i}`, id: l.id,
        export_invoice_item_id: l.export_invoice_item_id ?? null,
        product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty),
        packages: Number(l.packages ?? 0),
        shipper_unit: l.shipper_unit ?? undefined,
        marks: l.marks ?? undefined,
        gross_weight_kg: Number(l.gross_weight_kg ?? 0),
        net_weight_kg: Number(l.net_weight_kg ?? 0),
        dimensions: l.dimensions ?? undefined,
        batch_no: l.batch_no ?? undefined,
        notes: l.notes ?? undefined,
      })));
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  // Snapshot all EI fields onto PL when picking/loading the parent EI for a new PL.
  const snapshotFromEi = (ei: ExportInvoice) => {
    form.setFieldsValue({
      export_invoice_id: ei.id,
      partner_id: ei.partner_id ?? null,
      invoice_date: ei.invoice_date ? dayjs(ei.invoice_date) : undefined,
      date_of_supply: ei.date_of_supply ? dayjs(ei.date_of_supply) : undefined,
      transport_mode: (ei.transport_mode ?? undefined) as TransportMode | undefined,
      incoterm: ei.incoterm,
      lut_no: ei.lut_no ?? undefined,
      lut_date: ei.lut_date ? dayjs(ei.lut_date) : undefined,
      tax_details: ei.tax_details ?? undefined,
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
    });
    setEiOpts([{ value: ei.id, label: ei.code }]);
    if (ei.partner) setPartnerLabel(`${ei.partner.code} — ${ei.partner.name}`);
    if (ei.consignee) setConsigneeLabel(`${ei.consignee.code} — ${ei.consignee.name}`);
    setLines((ei.lines ?? []).map((l, i) => ({
      key: `from-${l.id ?? i}`,
      export_invoice_item_id: l.id ?? null,
      product_id: l.product_id,
      product_code: l.product?.code, product_name: l.product?.name,
      hsn_code: l.hsn_code ?? undefined,
      qty: Number(l.qty),
      packages: l.shipper_qty != null ? Number(l.shipper_qty) : 0,
      shipper_unit: l.shipper_unit ?? undefined,
      gross_weight_kg: 0, net_weight_kg: 0,
      batch_no: l.batch_no ?? undefined,
    })));
  };

  // Auto-prefill from ?from_ei query
  useEffect(() => {
    if (editing) return;
    if (!fromEi) return;
    (async () => {
      try {
        const ei = await exportInvoiceApi.get(Number(fromEi));
        snapshotFromEi(ei);
      } catch { message.error('Could not prefill from export invoice.'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, fromEi]);

  const onPickEi = async (eiId: number | null) => {
    if (!eiId) return;
    try {
      const ei = await exportInvoiceApi.get(eiId);
      snapshotFromEi(ei);
    } catch { message.error('Failed to fetch export invoice.'); }
  };

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

  const updateLine = (key: string, patch: Partial<PLLineRow>) => setLines((rows) => rows.map((r) => r.key === key ? { ...r, ...patch } : r));
  const removeLine = (key: string) => setLines((rows) => rows.filter((r) => r.key !== key));

  const totals = lines.reduce((acc, l) => ({
    qty: acc.qty + Number(l.qty || 0),
    packages: acc.packages + Number(l.packages || 0),
    gross: acc.gross + Number(l.gross_weight_kg || 0),
    net: acc.net + Number(l.net_weight_kg || 0),
  }), { qty: 0, packages: 0, gross: 0, net: 0 });

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        export_invoice_id: v.export_invoice_id,
        partner_id: v.partner_id ?? null,
        pl_date: v.pl_date.format('YYYY-MM-DD'),
        invoice_date: v.invoice_date?.format('YYYY-MM-DD'),
        date_of_supply: v.date_of_supply?.format('YYYY-MM-DD'),
        transport_mode: v.transport_mode,
        incoterm: v.incoterm,
        lut_no: v.lut_no,
        lut_date: v.lut_date?.format('YYYY-MM-DD'),
        tax_details: v.tax_details,
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
        marks_and_numbers: v.marks_and_numbers,
        total_pallet_qty: v.total_pallet_qty ?? 0,
        volume_cbm: v.volume_cbm ?? 0,
        notes: v.notes,
        lines: lines.filter((l) => l.product_id).map((l) => ({
          export_invoice_item_id: l.export_invoice_item_id ?? null,
          product_id: l.product_id!,
          hsn_code: l.hsn_code,
          qty: l.qty,
          packages: l.packages,
          shipper_unit: l.shipper_unit,
          marks: l.marks,
          gross_weight_kg: l.gross_weight_kg,
          net_weight_kg: l.net_weight_kg,
          dimensions: l.dimensions,
          batch_no: l.batch_no,
          notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && pl) { await packingListApi.update(pl.id, payload); message.success('Saved.'); }
      else {
        const created = await packingListApi.create(payload);
        message.success('Packing list created.');
        navigate(`/packing-lists/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onFinalize = async () => { if (!pl) return; try { setPL(await packingListApi.finalize(pl.id)); message.success('Finalized.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Finalize failed.'); } };
  const onCancel   = async () => { if (!pl) return; try { setPL(await packingListApi.cancel(pl.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const status: PackingListStatus | undefined = pl?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Packing list ${pl?.code ?? ''}` : 'New packing list'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/packing-lists')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && pl && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Finalize this packing list?', okText: 'Yes, finalize', danger: false, onOk: onFinalize })}>Finalize</Button>}
            {status && status !== 'cancelled' && pl && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this packing list?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {pl?.export_invoice && <Alert type="info" showIcon message={<span>For export invoice <Link to={`/export-invoices/${pl.export_invoice.id}`}>{pl.export_invoice.code}</Link>. Header was snapshotted from the invoice — edit anything here without affecting the invoice.</span>} />}

        <Form form={form} layout="vertical" initialValues={{ pl_date: dayjs(), transport_mode: 'air', incoterm: 'FOB', total_pallet_qty: 0, volume_cbm: 0 }}>
          <Divider orientation="left" plain>Document & Dates</Divider>
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Form.Item label="PL #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="packing_list" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item label="Export invoice" name="export_invoice_id" rules={[{ required: true }]}>
                <Select placeholder="Select EI..." options={eiOpts} disabled={readOnly || editing} onChange={(v: number) => void onPickEi(v)} />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}><Form.Item label="PL date" name="pl_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Invoice date" name="invoice_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Date of supply" name="date_of_supply"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}>
              <Form.Item label="Bill to (client)" name="partner_id">
                <PartnerSmartDropdown
                  type="client"
                  placeholder="Search..."
                  allowClear
                  disabled={readOnly}
                  fallbackLabel={partnerLabel}
                  onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Compliance</Divider>
          <Row gutter={16}>
            <Col xs={12} md={3}><Form.Item label="Transport mode" name="transport_mode"><Select options={TRANSPORT_MODES} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Incoterm" name="incoterm"><Select options={INCOTERMS.map((i) => ({ value: i, label: i }))} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="LUT no." name="lut_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="LUT date" name="lut_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Place of supply" name="place_of_supply"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Tax details" name="tax_details"><Input disabled={readOnly} placeholder="EXPORT WITH IGST UNDER LUT" /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Consignee (Ship To / Notify Client 1)</Divider>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Pick from CRM (optional)" name="consignee_partner_id">
                <PartnerSmartDropdown
                  placeholder="Search..."
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
            <Col xs={24} md={8}><Form.Item label="Registration no." name="consignee_registration_no"><Input disabled={readOnly} /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Notify Party 2</Divider>
          <Row gutter={16}>
            <Col xs={24} md={10}><Form.Item label="Notify party name" name="notify_party_name"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={14}><Form.Item label="Notify party address" name="notify_party_address"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Logistics</Divider>
          <Row gutter={16}>
            <Col xs={12} md={6}><Form.Item label="Port of loading" name="port_of_loading"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Port of discharge" name="port_of_discharge"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Loading destination" name="loading_destination"><Input disabled={readOnly} placeholder="INDIA" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Final destination" name="final_destination"><Input disabled={readOnly} placeholder="ROMANIA" /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain>Packing</Divider>
          <Row gutter={16}>
            <Col xs={12} md={4}><Form.Item label="Total pallet qty" name="total_pallet_qty"><InputNumber min={0} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Total CBM (volume)" name="volume_cbm"><InputNumber min={0} step={0.001} style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={16}><Form.Item label="Marks & numbers" name="marks_and_numbers"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        <Divider orientation="left" plain>Lines</Divider>
        <Table
          rowKey="key"
          dataSource={lines}
          size="small"
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong>Totals</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}>—</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><strong>{totals.qty.toFixed(3)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><strong>{totals.packages}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4}>—</Table.Summary.Cell>
              <Table.Summary.Cell index={5}>—</Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><strong>{totals.net.toFixed(2)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><strong>{totals.gross.toFixed(2)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={8}>—</Table.Summary.Cell>
              <Table.Summary.Cell index={9}>—</Table.Summary.Cell>
              <Table.Summary.Cell index={10} />
            </Table.Summary.Row>
          )}
          columns={[
            { title: 'Product', key: 'p', render: (_: unknown, r: PLLineRow) => r.product_code ? `${r.product_code} — ${r.product_name ?? ''}` : '—' },
            { title: 'HSN/SAC', key: 'h', width: 110, render: (_: unknown, r: PLLineRow) => (
              <Input disabled={readOnly} value={r.hsn_code} placeholder="e.g. 23099010" maxLength={16} onChange={(e) => updateLine(r.key, { hsn_code: e.target.value })} />
            )},
            { title: 'Qty', key: 'q', width: 100, align: 'right', render: (_: unknown, r: PLLineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.001} value={r.qty} onChange={(v) => updateLine(r.key, { qty: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Shipper', key: 'pk', width: 90, align: 'right', render: (_: unknown, r: PLLineRow) => (
              <InputNumber disabled={readOnly} min={0} value={r.packages} placeholder="pkgs" onChange={(v) => updateLine(r.key, { packages: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Unit', key: 'su', width: 90, render: (_: unknown, r: PLLineRow) => (
              <Input disabled={readOnly} value={r.shipper_unit} placeholder="BOX" maxLength={32} onChange={(e) => updateLine(r.key, { shipper_unit: e.target.value })} />
            )},
            { title: 'Marks', key: 'mk', width: 110, render: (_: unknown, r: PLLineRow) => (
              <Input disabled={readOnly} value={r.marks} onChange={(e) => updateLine(r.key, { marks: e.target.value })} />
            )},
            { title: 'Net (kg)', key: 'nw', width: 110, align: 'right', render: (_: unknown, r: PLLineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.01} value={r.net_weight_kg} onChange={(v) => updateLine(r.key, { net_weight_kg: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Gross (kg)', key: 'gw', width: 110, align: 'right', render: (_: unknown, r: PLLineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.01} value={r.gross_weight_kg} onChange={(v) => updateLine(r.key, { gross_weight_kg: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Dimensions', key: 'dm', width: 130, render: (_: unknown, r: PLLineRow) => (
              <Input disabled={readOnly} placeholder="L x W x H" value={r.dimensions} onChange={(e) => updateLine(r.key, { dimensions: e.target.value })} />
            )},
            { title: 'Batch', key: 'b', width: 110, render: (_: unknown, r: PLLineRow) => (
              <Input disabled={readOnly} value={r.batch_no} onChange={(e) => updateLine(r.key, { batch_no: e.target.value })} />
            )},
            { title: '', key: 'rm', width: 50, render: (_: unknown, r: PLLineRow) => readOnly ? null : (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeLine(r.key)} />
            )},
          ]}
        />
        {!readOnly && (
          <Button icon={<PlusOutlined />} onClick={() => setLines((rows) => [...rows, { key: `n-${Date.now()}-${Math.random()}`, qty: 1, packages: 1, shipper_unit: 'BOX', gross_weight_kg: 0, net_weight_kg: 0 }])}>Add product</Button>
        )}

        <Card size="small" style={{ background: '#fafafa' }}>
          <Row gutter={[16, 8]}>
            <Col xs={12} md={4}><Typography.Text type="secondary">Total qty</Typography.Text><br /><strong>{totals.qty.toFixed(3)}</strong></Col>
            <Col xs={12} md={4}><Typography.Text type="secondary">Total shipper</Typography.Text><br /><strong>{totals.packages}</strong></Col>
            <Col xs={12} md={4}><Typography.Text type="secondary">Total pallet qty</Typography.Text><br /><strong>{Form.useWatch('total_pallet_qty', form) ?? 0}</strong></Col>
            <Col xs={12} md={4}><Typography.Text type="secondary">Total CBM</Typography.Text><br /><strong>{Number(Form.useWatch('volume_cbm', form) ?? 0).toFixed(3)}</strong></Col>
            <Col xs={12} md={4}><Typography.Text type="secondary">Total net wt (kg)</Typography.Text><br /><strong>{totals.net.toFixed(2)}</strong></Col>
            <Col xs={12} md={4}><Typography.Text type="secondary">Total gross wt (kg)</Typography.Text><br /><strong>{totals.gross.toFixed(2)}</strong></Col>
          </Row>
        </Card>
      </Space>
    </Card>
  );
}
