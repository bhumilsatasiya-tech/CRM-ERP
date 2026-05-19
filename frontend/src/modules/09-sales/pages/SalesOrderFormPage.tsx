import { useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined, ExperimentOutlined, FileAddOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { salesOrderApi } from '../api/salesApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { useAppSelector } from '../../../app/hooks';
import DocumentLineEditor, { type DocLine, recalcLine } from '../../common/DocumentLineEditor';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import DocumentNumberField from '../../common/DocumentNumberField';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import SaveActions from '../../common/SaveActions';
import VoucherChainStrip, { type ChainNode } from '../../common/VoucherChainStrip';
import type { DocTaxType, SOStatus, SalesOrder } from '../types/sales.types';

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD'].map((c) => ({ value: c, label: c }));
const TAX_TYPE_OPTIONS: Array<{ value: DocTaxType; label: string }> = [
  { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
  { value: 'igst',      label: 'IGST (inter-state)' },
  { value: 'none',      label: 'None (export under LUT / out of scope)' },
];

interface HeaderShape {
  code?: string;
  partner_id: number; warehouse_id?: number | null;
  order_date: Dayjs; expected_delivery_date?: Dayjs;
  reference?: string; notes?: string; terms_and_conditions?: string;
  discount?: number; shipping?: number;
  currency: string;
  tax_type: DocTaxType;
}

export default function SalesOrderFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);
  const [form] = Form.useForm<HeaderShape>();
  const [so, setSo] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);
  const [warehouses, setWarehouses] = useState<Array<{ value: number; label: string }>>([]);

  useEffect(() => {
    if (activeCompanyId) {
      warehouseApi.list(activeCompanyId, { per_page: 200 }).then((r) => setWarehouses(r.data.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })))).catch(() => undefined);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    salesOrderApi.get(Number(id)).then((s) => {
      setSo(s);
      form.setFieldsValue({
        code: s.code,
        partner_id: s.partner_id, warehouse_id: s.warehouse_id ?? undefined,
        order_date: dayjs(s.order_date),
        expected_delivery_date: s.expected_delivery_date ? dayjs(s.expected_delivery_date) : undefined,
        reference: s.reference ?? undefined,
        notes: s.notes ?? undefined,
        terms_and_conditions: s.terms_and_conditions ?? undefined,
        discount: s.discount, shipping: s.shipping,
        currency: s.currency,
        tax_type: (s.tax_type ?? 'cgst_sgst') as DocTaxType,
      });
      setLines((s.lines ?? []).map((l, i) => recalcLine({
        key: `e-${l.id ?? i}`, product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty), rate: Number(l.rate), tax_rate: Number(l.tax_rate),
        notes: l.notes ?? undefined,
      })));
      if (s.partner) setPartnerLabel(`${s.partner.code} — ${s.partner.name}`);
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async (): Promise<{ id: number; code?: string | null } | null> => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        partner_id: v.partner_id, warehouse_id: v.warehouse_id ?? null,
        order_date: v.order_date.format('YYYY-MM-DD'),
        expected_delivery_date: v.expected_delivery_date?.format('YYYY-MM-DD'),
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
      if (editing && so) {
        const updated = await salesOrderApi.update(so.id, payload);
        setSo(updated);
        message.success('Saved.');
        return { id: updated.id, code: updated.code };
      }
      const created = await salesOrderApi.create(payload);
      message.success('SO created.');
      return { id: created.id, code: created.code };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
      return null;
    }
    finally { setSaving(false); }
  };

  const onApprove = async () => { if (!so) return; try { setSo(await salesOrderApi.approve(so.id)); message.success('Approved.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Approve failed.'); } };
  const onCancel  = async () => { if (!so) return; try { setSo(await salesOrderApi.cancel(so.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const createInvoiceFromSO = () => {
    if (!so) return;
    // Hand over to invoice form with SO data prefilled (via query string)
    navigate(`/invoices/new?from_so=${so.id}`);
  };

  const watchedTaxType = (Form.useWatch('tax_type', form) as DocTaxType | undefined) ?? 'cgst_sgst';
  const watchedCurrency = Form.useWatch('currency', form) as string | undefined;
  const status: SOStatus | undefined = so?.status;
  const readOnly = !!status && status !== 'draft' && status !== 'submitted';

  // Voucher chain: Quotation → SO → (Invoices/Batches/ExportInvoices)
  const chain: ChainNode[] = editing && so ? [
    ...(so.quotation ? [{ type: 'quotation' as const, id: so.quotation.id, code: so.quotation.code, status: so.quotation.status }] : []),
    { type: 'sales-order' as const, id: so.id, code: so.code, current: true, status: so.status },
    ...((so.invoices?.length ?? 0) > 0 ? [{
      type: 'invoice' as const, id: so.invoices![0].id,
      code: so.invoices!.length === 1 ? so.invoices![0].code : `${so.invoices!.length} invoices`,
      badge: so.invoices!.length > 1 ? `x${so.invoices!.length}` : undefined,
    }] : []),
    ...((so.production_batches?.length ?? 0) > 0 ? [{
      type: 'production-batch' as const, id: so.production_batches![0].id,
      code: so.production_batches!.length === 1 ? so.production_batches![0].code : `${so.production_batches!.length} batches`,
      badge: so.production_batches!.length > 1 ? `x${so.production_batches!.length}` : undefined,
    }] : []),
  ] : [];

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {chain.length > 1 && <VoucherChainStrip chain={chain} title="Chain" />}
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Proforma ${so?.code ?? ''}` : 'New Proforma Invoice'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/sales-orders')}>Back</Button>
            {editing && so && <DownloadPdfButton url={`/sales-orders/${so.id}/pdf`} filename={`proforma-${so.code}.pdf`} />}
            {!readOnly && (
              <SaveActions
                docType="sales-order"
                editing={editing}
                doSave={onSave}
                entityId={so?.id}
                entityCode={so?.code}
                disabled={saving}
              />
            )}
            {(status === 'draft' || status === 'submitted') && editing && <Button icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Approve this Proforma?', okText: 'Yes, approve', danger: false, onOk: onApprove })}>Approve</Button>}
            {(status === 'approved' || status === 'partial' || status === 'in_production') && <Button type="primary" icon={<FileAddOutlined />} onClick={createInvoiceFromSO}>Create Tax Invoice</Button>}
            {(status === 'approved' || status === 'partial' || status === 'in_production') && so && <Button icon={<ExperimentOutlined />} onClick={() => navigate(`/production-batches/new?from_so=${so.id}`)}>New production batch</Button>}
            {(status === 'approved' || status === 'partial' || status === 'in_production') && so && <Button onClick={() => navigate(`/export-invoices/new?from_so=${so.id}`)}>New export invoice</Button>}
            {so && status && status !== 'draft' && <Button icon={<NodeIndexOutlined />} onClick={() => navigate(`/tracking/sales-orders/${so.id}`)}>Trace</Button>}
            {status && status !== 'cancelled' && status !== 'invoiced' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this SO?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {so?.quotation && (
          <Alert type="info" showIcon message={
            <span>Originated from quotation <Link to={`/quotations/${so.quotation.id}`}>{so.quotation.code}</Link> (status: {so.quotation.status}).</span>
          } />
        )}
        {!so?.quotation && so?.quotation_id && <Alert type="info" showIcon message={`Originated from Quotation #${so.quotation_id}.`} />}
        <Form form={form} layout="vertical" initialValues={{ order_date: dayjs(), discount: 0, shipping: 0, currency: 'INR', tax_type: 'cgst_sgst' }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Proforma #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="sales_order" editing={editing} disabled={readOnly} />
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
            <Col xs={24} md={6}><Form.Item label="Ship from warehouse" name="warehouse_id"><Select allowClear options={warehouses} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Order date" name="order_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Expected delivery" name="expected_delivery_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><AutoComplete options={CURRENCY_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Tax type" name="tax_type" rules={[{ required: true }]}><Select options={TAX_TYPE_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Client PO #" name="reference"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Terms & conditions" name="terms_and_conditions"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>
        <DocumentLineEditor
          lines={lines} onChange={setLines} readOnly={readOnly} productTypeFilter="finished"
          taxType={watchedTaxType}
          currency={watchedCurrency}
        />

        {so && so.production_batches && so.production_batches.length > 0 && (
          <Card size="small" title={`Linked production batches (${so.production_batches.length})`}>
            <Table
              rowKey="id"
              dataSource={so.production_batches}
              size="small"
              pagination={false}
              columns={[
                { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/production-batches/${r.id}`}>{c}</Link> },
                { title: 'Status', dataIndex: 'status', width: 120, render: (s: string) => <Tag>{s}</Tag> },
                { title: 'Planned',  dataIndex: 'qty_planned',  align: 'right' as const, width: 110, render: (v: number) => Number(v).toFixed(3) },
                { title: 'Produced', dataIndex: 'qty_produced', align: 'right' as const, width: 110, render: (v: number) => Number(v).toFixed(3) },
                { title: 'Failed',   dataIndex: 'qty_failed',   align: 'right' as const, width: 100, render: (v: number) => Number(v).toFixed(3) },
                { title: 'Completed', dataIndex: 'completed_at', width: 170, render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
              ]}
            />
          </Card>
        )}

        {so && so.export_invoices && so.export_invoices.length > 0 && (
          <Card size="small" title={`Linked export invoices (${so.export_invoices.length})`}>
            <Table
              rowKey="id"
              dataSource={so.export_invoices}
              size="small"
              pagination={false}
              columns={[
                { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/export-invoices/${r.id}`}>{c}</Link> },
                { title: 'Date', dataIndex: 'invoice_date', width: 110 },
                { title: 'Status', dataIndex: 'status', width: 130, render: (s: string) => <Tag>{s}</Tag> },
                { title: 'Currency', dataIndex: 'currency', width: 80 },
                { title: 'Total',   dataIndex: 'total',       align: 'right' as const, width: 120, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Paid',    dataIndex: 'paid_amount', align: 'right' as const, width: 120, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Balance', dataIndex: 'balance',     align: 'right' as const, width: 120, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              ]}
            />
          </Card>
        )}

        {so && so.invoices && so.invoices.length > 0 && (
          <Card size="small" title={`Linked invoices (${so.invoices.length})`}>
            <Table
              rowKey="id"
              dataSource={so.invoices}
              size="small"
              pagination={false}
              columns={[
                { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/invoices/${r.id}`}>{c}</Link> },
                { title: 'Date', dataIndex: 'invoice_date', width: 110 },
                { title: 'Status', dataIndex: 'status', width: 130, render: (s: string) => <Tag>{s}</Tag> },
                { title: 'Total',   dataIndex: 'total',       align: 'right' as const, width: 120, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Paid',    dataIndex: 'paid_amount', align: 'right' as const, width: 120, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Balance', dataIndex: 'balance',     align: 'right' as const, width: 120, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              ]}
            />
          </Card>
        )}
      </Space>
    </Card>
  );
}
