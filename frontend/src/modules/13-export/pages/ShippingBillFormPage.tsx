import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, Upload, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CloseOutlined, DeleteOutlined, FileSearchOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { exportInvoiceApi, shippingBillApi } from '../api/exportApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { useAppSelector } from '../../../app/hooks';
import type { ShippingBill, ShippingBillStatus } from '../types/export.types';

interface HeaderShape {
  code?: string;
  export_invoice_id: number;
  warehouse_id: number;
  bl_no?: string;
  bl_date?: Dayjs;
  vessel_name?: string;
  voyage_no?: string;
  carrier?: string;
  container_no?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  etd?: Dayjs;
  eta?: Dayjs;
  notes?: string;
}

interface SBLineRow {
  key: string;
  id?: number;
  export_invoice_item_id?: number | null;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  hsn_code?: string;
  qty: number;
  remaining?: number;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
}

export default function ShippingBillFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromEi = params.get('from_ei');
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);

  const [form] = Form.useForm<HeaderShape>();
  const [sb, setSb] = useState<ShippingBill | null>(null);
  const [lines, setLines] = useState<SBLineRow[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ value: number; label: string }>>([]);
  const [eiOpts, setEiOpts] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      warehouseApi.list(activeCompanyId, { per_page: 200 })
        .then((r) => setWarehouses(r.data.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))))
        .catch(() => undefined);
    }
  }, [activeCompanyId]);

  // Load existing SB
  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    shippingBillApi.get(Number(id)).then((x) => {
      setSb(x);
      form.setFieldsValue({
        code: x.code,
        export_invoice_id: x.export_invoice_id, warehouse_id: x.warehouse_id,
        bl_no: x.bl_no ?? undefined,
        bl_date: x.bl_date ? dayjs(x.bl_date) : undefined,
        vessel_name: x.vessel_name ?? undefined,
        voyage_no: x.voyage_no ?? undefined,
        carrier: x.carrier ?? undefined,
        container_no: x.container_no ?? undefined,
        port_of_loading: x.port_of_loading ?? undefined,
        port_of_discharge: x.port_of_discharge ?? undefined,
        etd: x.etd ? dayjs(x.etd) : undefined,
        eta: x.eta ? dayjs(x.eta) : undefined,
        notes: x.notes ?? undefined,
      });
      if (x.export_invoice) setEiOpts([{ value: x.export_invoice.id, label: x.export_invoice.code }]);
      setLines((x.lines ?? []).map((l, i) => ({
        key: `e-${l.id ?? i}`, id: l.id,
        export_invoice_item_id: l.export_invoice_item_id ?? null,
        product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty),
        batch_no: l.batch_no ?? undefined,
        expiry_date: l.expiry_date ?? undefined,
        notes: l.notes ?? undefined,
      })));
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  // Prefill from EI: load lines with remaining qty
  useEffect(() => {
    if (editing) return;
    if (!fromEi) return;
    (async () => {
      try {
        const ei = await exportInvoiceApi.get(Number(fromEi));
        form.setFieldsValue({ export_invoice_id: ei.id });
        setEiOpts([{ value: ei.id, label: ei.code }]);
        setLines((ei.lines ?? [])
          .filter((l) => Number(l.qty) > Number(l.shipped_qty ?? 0))
          .map((l, i) => ({
            key: `from-${l.id ?? i}`,
            export_invoice_item_id: l.id ?? null,
            product_id: l.product_id,
            product_code: l.product?.code, product_name: l.product?.name,
            hsn_code: (l as { hsn_code?: string | null }).hsn_code ?? undefined,
            qty: Number(l.qty) - Number(l.shipped_qty ?? 0),
            remaining: Number(l.qty) - Number(l.shipped_qty ?? 0),
            batch_no: l.batch_no ?? undefined,
            expiry_date: l.expiry_date ?? undefined,
          })));
      } catch { message.error('Could not prefill from export invoice.'); }
    })();
  }, [editing, fromEi, form]);

  const updateLine = (key: string, patch: Partial<SBLineRow>) => setLines((rows) => rows.map((r) => r.key === key ? { ...r, ...patch } : r));
  const removeLine = (key: string) => setLines((rows) => rows.filter((r) => r.key !== key));

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        export_invoice_id: v.export_invoice_id,
        warehouse_id: v.warehouse_id,
        bl_no: v.bl_no, bl_date: v.bl_date?.format('YYYY-MM-DD'),
        vessel_name: v.vessel_name, voyage_no: v.voyage_no, carrier: v.carrier,
        container_no: v.container_no,
        port_of_loading: v.port_of_loading, port_of_discharge: v.port_of_discharge,
        etd: v.etd?.format('YYYY-MM-DD'), eta: v.eta?.format('YYYY-MM-DD'),
        notes: v.notes,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          export_invoice_item_id: l.export_invoice_item_id ?? null,
          product_id: l.product_id!, hsn_code: l.hsn_code, qty: l.qty,
          batch_no: l.batch_no, expiry_date: l.expiry_date, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && sb) { await shippingBillApi.update(sb.id, payload); message.success('Saved.'); }
      else {
        const created = await shippingBillApi.create(payload);
        message.success('Shipping bill created.');
        navigate(`/shipping-bills/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onDispatch = async () => { if (!sb) return; try { setSb(await shippingBillApi.dispatch(sb.id)); message.success('Dispatched — stock OUT recorded.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Dispatch failed.'); } };
  const onCancel   = async () => { if (!sb) return; try { setSb(await shippingBillApi.cancel(sb.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  /** Upload SB PDF, run OCR, prefill matching form fields with extracted values. */
  const onOcrUpload = async (file: File) => {
    try {
      const data = await shippingBillApi.extractFromPdf(file);
      const patch: Record<string, unknown> = {};
      if (data.sb_no)              patch.sb_no = data.sb_no;
      if (data.sb_date)            patch.sb_date = dayjs(data.sb_date as string);
      if (data.port_of_loading)    patch.port_of_loading = data.port_of_loading;
      if (data.vessel_name)        patch.vessel_name = data.vessel_name;
      if (data.voyage_no)          patch.voyage_no = data.voyage_no;
      if (data.gross_weight_kg)    patch.gross_weight_kg = data.gross_weight_kg;
      if (data.net_weight_kg)      patch.net_weight_kg = data.net_weight_kg;
      form.setFieldsValue(patch);
      message.success('OCR done — review the extracted fields before saving.');
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 503) message.warning(err.response?.data?.message ?? 'OCR is not configured.');
      else message.error(err.response?.data?.message ?? 'OCR failed.');
    }
  };

  const status: ShippingBillStatus | undefined = sb?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Shipping bill ${sb?.code ?? ''}` : 'New shipping bill'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/shipping-bills')}>Back</Button>
            {!readOnly && (
              <Upload<unknown>
                accept=".pdf,.jpg,.jpeg,.png"
                showUploadList={false}
                beforeUpload={(file: File) => { void onOcrUpload(file); return false; }}
              >
                <Button icon={<FileSearchOutlined />}>OCR from PDF</Button>
              </Upload>
            )}
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && sb && <Button type="primary" icon={<SendOutlined />}
              onClick={() => confirmDelete({ title: 'Dispatch this shipping bill?', content: 'Stock OUT will be written to the ledger.', okText: 'Yes, dispatch', danger: false, onOk: onDispatch })}>Dispatch</Button>}
            {status && status !== 'cancelled' && sb && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this shipping bill?', content: 'Stock will be reversed if it was dispatched.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {sb?.export_invoice && <Alert type="info" showIcon message={<span>For export invoice <Link to={`/export-invoices/${sb.export_invoice.id}`}>{sb.export_invoice.code}</Link>.</span>} />}

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Form.Item label="SB #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="shipping_bill" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}><Form.Item label="Export invoice" name="export_invoice_id" rules={[{ required: true }]}><Select disabled options={eiOpts} /></Form.Item></Col>
            <Col xs={24} md={5}><Form.Item label="Source warehouse (OUT)" name="warehouse_id" rules={[{ required: true }]}><Select options={warehouses} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="BL no." name="bl_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="BL date" name="bl_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="ETD" name="etd"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="ETA" name="eta"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Vessel name" name="vessel_name"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Voyage no." name="voyage_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Carrier" name="carrier"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Container no." name="container_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={5}><Form.Item label="Port of loading" name="port_of_loading"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={5}><Form.Item label="Port of discharge" name="port_of_discharge"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        <Typography.Text strong>Lines (will be shipped OUT)</Typography.Text>
        <Table
          rowKey="key"
          dataSource={lines}
          size="small"
          pagination={false}
          columns={[
            { title: 'Product', key: 'p', render: (_: unknown, r: SBLineRow) => r.product_code ? `${r.product_code} — ${r.product_name ?? ''}` : '—' },
            { title: 'HSN/SAC', key: 'h', width: 110, render: (_: unknown, r: SBLineRow) => (
              <Input disabled={readOnly} value={r.hsn_code} placeholder="e.g. 3004" maxLength={16} onChange={(e) => updateLine(r.key, { hsn_code: e.target.value })} />
            )},
            { title: 'Qty', key: 'q', width: 130, render: (_: unknown, r: SBLineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.001} max={r.remaining} value={r.qty} onChange={(v) => updateLine(r.key, { qty: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            ...(!readOnly ? [{ title: 'Remaining', key: 'rem', width: 110, align: 'right' as const, render: (_: unknown, r: SBLineRow) => r.remaining != null ? r.remaining.toFixed(3) : '—' }] : []),
            { title: 'Batch', key: 'b', width: 140, render: (_: unknown, r: SBLineRow) => (
              <Input disabled={readOnly} value={r.batch_no} onChange={(e) => updateLine(r.key, { batch_no: e.target.value })} />
            )},
            { title: 'Expiry', key: 'e', width: 150, render: (_: unknown, r: SBLineRow) => (
              <DatePicker disabled={readOnly} value={r.expiry_date ? dayjs(r.expiry_date) : null} onChange={(d) => updateLine(r.key, { expiry_date: d ? d.format('YYYY-MM-DD') : undefined })} style={{ width: '100%' }} />
            )},
            { title: '', key: 'rm', width: 50, render: (_: unknown, r: SBLineRow) => readOnly ? null : (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeLine(r.key)} />
            )},
          ]}
        />
        {!readOnly && (
          <Button icon={<PlusOutlined />} onClick={() => setLines((rows) => [...rows, { key: `n-${Date.now()}-${Math.random()}`, qty: 1 }])}>Add product</Button>
        )}
      </Space>
    </Card>
  );
}
