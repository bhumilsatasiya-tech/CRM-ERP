import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { grnApi } from '../api/purchaseApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { useAppSelector } from '../../../app/hooks';
import DocumentLineEditor, { type DocLine, recalcLine } from '../../common/DocumentLineEditor';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import DocumentNumberField from '../../common/DocumentNumberField';
import type { Grn, GrnStatus } from '../types/purchase.types';

interface HeaderShape {
  code?: string;
  partner_id: number; warehouse_id: number;
  grn_date: Dayjs; supplier_invoice_no?: string; supplier_invoice_date?: Dayjs;
  vehicle_no?: string; lr_no?: string; notes?: string;
}

export default function GrnFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);
  const [form] = Form.useForm<HeaderShape>();
  const [grn, setGrn] = useState<Grn | null>(null);
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
    grnApi.get(Number(id)).then((g) => {
      setGrn(g);
      form.setFieldsValue({
        code: g.code,
        partner_id: g.partner_id, warehouse_id: g.warehouse_id,
        grn_date: dayjs(g.grn_date),
        supplier_invoice_no: g.supplier_invoice_no ?? undefined,
        supplier_invoice_date: g.supplier_invoice_date ? dayjs(g.supplier_invoice_date) : undefined,
        vehicle_no: g.vehicle_no ?? undefined, lr_no: g.lr_no ?? undefined, notes: g.notes ?? undefined,
      });
      setLines((g.lines ?? []).map((l, i) => recalcLine({
        key: `e-${l.id ?? i}`, product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: l.hsn_code ?? undefined,
        qty: Number(l.qty), rate: Number(l.rate), tax_rate: 0,
        batch_no: l.batch_no ?? undefined, expiry_date: l.expiry_date ?? undefined,
        notes: l.notes ?? undefined,
      })));
      if (g.partner) setPartnerLabel(`${g.partner.code} — ${g.partner.name}`);
    }).catch(() => message.error('Failed to load GRN.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        partner_id: v.partner_id, warehouse_id: v.warehouse_id,
        grn_date: v.grn_date.format('YYYY-MM-DD'),
        supplier_invoice_no: v.supplier_invoice_no,
        supplier_invoice_date: v.supplier_invoice_date?.format('YYYY-MM-DD'),
        vehicle_no: v.vehicle_no, lr_no: v.lr_no, notes: v.notes,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!, hsn_code: l.hsn_code, qty: l.qty, rate: l.rate,
          batch_no: l.batch_no, expiry_date: l.expiry_date, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && grn) { await grnApi.update(grn.id, payload); message.success('Saved.'); }
      else {
        const created = await grnApi.create(payload);
        message.success('GRN created.');
        navigate(`/grns/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  const onReceive = async () => { if (!grn) return; try { setGrn(await grnApi.receive(grn.id)); message.success('Stock received & posted to ledger.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Receive failed.'); } };
  const onCancel = async () => { if (!grn) return; try { setGrn(await grnApi.cancel(grn.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const status: GrnStatus | undefined = grn?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `GRN ${grn?.code ?? ''}` : 'New GRN'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/grns')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && editing && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Receive this GRN?', content: 'Stock IN will be written to the ledger.', okText: 'Yes, receive', danger: false, onOk: onReceive })}>Receive</Button>}
            {status && status !== 'cancelled' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this GRN?', content: 'Stock will be reversed if it was received.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {status === 'received' && <Alert type="success" showIcon message="Goods received and stock posted to the ledger." />}
        <Form form={form} layout="vertical" initialValues={{ grn_date: dayjs() }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="GRN #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="grn" editing={editing} disabled={readOnly} />
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
            <Col xs={24} md={6}><Form.Item label="Warehouse" name="warehouse_id" rules={[{ required: true }]}><Select options={warehouses} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="GRN date" name="grn_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Supplier invoice #" name="supplier_invoice_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Supplier inv. date" name="supplier_invoice_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Vehicle #" name="vehicle_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="LR #" name="lr_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>
        <DocumentLineEditor lines={lines} onChange={setLines} readOnly={readOnly} showBatch productTypeFilter="raw" />
      </Space>
    </Card>
  );
}
