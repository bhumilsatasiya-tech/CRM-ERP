import { useEffect, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { purchaseOrderApi } from '../api/purchaseApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { useAppSelector } from '../../../app/hooks';
import DocumentLineEditor, { type DocLine, recalcLine, type DocTaxType } from '../../common/DocumentLineEditor';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import DocumentNumberField from '../../common/DocumentNumberField';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import SaveActions from '../../common/SaveActions';
import type { POStatus, PurchaseOrder } from '../types/purchase.types';

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD'].map((c) => ({ value: c, label: c }));
const TAX_TYPE_OPTIONS: Array<{ value: DocTaxType; label: string }> = [
  { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
  { value: 'igst',      label: 'IGST (inter-state)' },
  { value: 'none',      label: 'None (out of scope)' },
];

interface HeaderShape {
  code?: string;
  partner_id: number; warehouse_id?: number | null;
  order_date: Dayjs; expected_date?: Dayjs;
  reference?: string; notes?: string;
  discount?: number; shipping?: number;
  currency: string;
  tax_type: DocTaxType;
}

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);
  const [form] = Form.useForm<HeaderShape>();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
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
    purchaseOrderApi.get(Number(id)).then((p) => {
      setPO(p);
      form.setFieldsValue({
        code: p.code,
        partner_id: p.partner_id,
        warehouse_id: p.warehouse_id,
        order_date: dayjs(p.order_date),
        expected_date: p.expected_date ? dayjs(p.expected_date) : undefined,
        reference: p.reference ?? undefined,
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
        qty: Number(l.qty), rate: Number(l.rate),
        tax_rate: Number(l.tax_rate),
        notes: l.notes ?? undefined,
      })));
      if (p.partner) setPartnerLabel(`${p.partner.code} — ${p.partner.name}`);
    }).catch(() => message.error('Failed to load PO.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async (): Promise<{ id: number; code?: string | null } | null> => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        partner_id: v.partner_id,
        warehouse_id: v.warehouse_id ?? null,
        order_date: v.order_date.format('YYYY-MM-DD'),
        expected_date: v.expected_date?.format('YYYY-MM-DD'),
        reference: v.reference,
        notes: v.notes,
        discount: v.discount ?? 0,
        shipping: v.shipping ?? 0,
        currency: v.currency,
        tax_type: v.tax_type,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!, hsn_code: l.hsn_code, qty: l.qty, rate: l.rate,
          tax_rate: l.tax_rate, discount_pct: 0, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return null; }
      if (editing && po) {
        const updated = await purchaseOrderApi.update(po.id, payload);
        setPO(updated);
        message.success('Saved.');
        return { id: updated.id, code: updated.code };
      }
      const created = await purchaseOrderApi.create(payload);
      message.success('PO created.');
      return { id: created.id, code: created.code };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
      return null;
    }
    finally { setSaving(false); }
  };

  const onApprove = async () => { if (!po) return; try { setPO(await purchaseOrderApi.approve(po.id)); message.success('Approved.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Approve failed.'); } };
  const onCancel = async () => { if (!po) return; try { setPO(await purchaseOrderApi.cancel(po.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const watchedTaxType = (Form.useWatch('tax_type', form) as DocTaxType | undefined) ?? 'cgst_sgst';
  const watchedCurrency = Form.useWatch('currency', form) as string | undefined;
  const status: POStatus | undefined = po?.status;
  const readOnly = !!status && status !== 'draft' && status !== 'submitted';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `PO ${po?.code ?? ''}` : 'New purchase order'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/purchase-orders')}>Back</Button>
            {editing && po && <DownloadPdfButton url={`/purchase-orders/${po.id}/pdf`} filename={`po-${po.code}.pdf`} />}
            {!readOnly && (
              <SaveActions
                docType="purchase-order"
                editing={editing}
                doSave={onSave}
                entityId={po?.id}
                entityCode={po?.code}
                disabled={saving}
              />
            )}
            {(status === 'draft' || status === 'submitted') && editing && <Button icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Approve this PO?', okText: 'Yes, approve', danger: false, onOk: onApprove })}>Approve</Button>}
            {status && status !== 'cancelled' && status !== 'received' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this PO?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {readOnly && <Alert type="info" showIcon message={`This PO is ${status} — fields are read-only.`} />}
        <Form form={form} layout="vertical" initialValues={{ order_date: dayjs(), discount: 0, shipping: 0, currency: 'INR', tax_type: 'cgst_sgst' }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="PO #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="purchase_order" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item label="Supplier" name="partner_id" rules={[{ required: true }]}>
                <PartnerSmartDropdown
                  type="supplier"
                  placeholder="Search supplier..."
                  disabled={readOnly}
                  fallbackLabel={partnerLabel}
                  onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Warehouse" name="warehouse_id"><Select allowClear options={warehouses} disabled={readOnly} /></Form.Item>
            </Col>
            <Col xs={12} md={4}><Form.Item label="Order date" name="order_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Expected date" name="expected_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><AutoComplete options={CURRENCY_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Tax type" name="tax_type" rules={[{ required: true }]}><Select options={TAX_TYPE_OPTIONS} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Supplier reference" name="reference"><Input disabled={readOnly} /></Form.Item></Col>
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
