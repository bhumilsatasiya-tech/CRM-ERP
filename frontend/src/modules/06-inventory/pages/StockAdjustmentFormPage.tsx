import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { stockAdjustmentApi } from '../api/inventoryApi';
import { productApi } from '../../05-products/api/productsApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { useAppSelector } from '../../../app/hooks';
import type { AdjustmentStatus, StockAdjustment } from '../types/inventory.types';

interface LineRow {
  key: string;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  current_qty: number;
  counted_qty: number;
  rate: number;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
}

export default function StockAdjustmentFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);

  const [form] = Form.useForm<{ code?: string; warehouse_id: number; adjustment_date: dayjs.Dayjs; reason: string; notes?: string }>();
  const [adj, setAdj] = useState<StockAdjustment | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [productOpts, setProductOpts] = useState<Array<{ value: number; label: string; product: { code: string; name: string; standard_cost: number } }>>([]);

  useEffect(() => {
    if (activeCompanyId) {
      warehouseApi.list(activeCompanyId, { per_page: 200, is_active: true }).then((r) => setWarehouses(r.data)).catch(() => undefined);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    stockAdjustmentApi.get(Number(id))
      .then((a) => {
        setAdj(a);
        form.setFieldsValue({
          code: a.code,
          warehouse_id: a.warehouse_id,
          adjustment_date: dayjs(a.adjustment_date),
          reason: a.reason,
          notes: a.notes ?? undefined,
        });
        setLines((a.lines ?? []).map((l, idx) => ({
          key: `existing-${l.id ?? idx}`,
          product_id: l.product_id,
          product_code: l.product?.code,
          product_name: l.product?.name,
          current_qty: Number(l.current_qty),
          counted_qty: Number(l.counted_qty),
          rate: Number(l.rate),
          batch_no: l.batch_no ?? undefined,
          expiry_date: l.expiry_date ?? undefined,
          notes: l.notes ?? undefined,
        })));
      })
      .catch(() => message.error('Failed to load adjustment.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSearchProduct = async (q: string) => {
    if (!q) { setProductOpts([]); return; }
    try {
      const list = await productApi.lookup(q, undefined, undefined, 20);
      setProductOpts(list.map((p) => ({
        value: Number(p.id),
        label: `${p.code} — ${p.name}`,
        product: { code: String(p.code), name: String(p.name), standard_cost: Number((p as { standard_cost?: number }).standard_cost ?? 0) },
      })));
    } catch { /* ignore */ }
  };

  const addLine = () => setLines((prev) => [...prev, {
    key: `new-${Date.now()}`, current_qty: 0, counted_qty: 0, rate: 0,
  }]);

  const updateLine = (key: string, patch: Partial<LineRow>) =>
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, ...patch } : l));

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        warehouse_id: v.warehouse_id,
        adjustment_date: v.adjustment_date.format('YYYY-MM-DD'),
        reason: v.reason,
        notes: v.notes,
        lines: lines.filter((l) => l.product_id).map((l) => ({
          product_id: l.product_id!,
          current_qty: l.current_qty,
          counted_qty: l.counted_qty,
          rate: l.rate,
          batch_no: l.batch_no,
          expiry_date: l.expiry_date,
          notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && adj) {
        await stockAdjustmentApi.update(adj.id, payload);
        message.success('Saved.');
      } else {
        const created = await stockAdjustmentApi.create(payload);
        message.success('Adjustment created.');
        navigate(`/stock/adjustments/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onSubmit = async () => {
    if (!adj) return;
    try { const r = await stockAdjustmentApi.submit(adj.id); setAdj(r); message.success('Submitted for approval.'); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Submit failed.'); }
  };
  const onApprove = async () => {
    if (!adj) return;
    try { const r = await stockAdjustmentApi.approve(adj.id); setAdj(r); message.success('Approved & posted to ledger.'); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Approval failed.'); }
  };
  const onCancel = async () => {
    if (!adj) return;
    try { const r = await stockAdjustmentApi.cancel(adj.id, 'Cancelled by user'); setAdj(r); message.success('Cancelled.'); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); }
  };

  const status: AdjustmentStatus | undefined = adj?.status;
  const readOnly = !!status && status !== 'draft';

  const columns = [
    { title: 'Product', key: 'product', render: (_: unknown, row: LineRow) => (
      <Select
        showSearch placeholder="Search product..." allowClear style={{ width: 320 }}
        disabled={readOnly}
        value={row.product_id}
        onSearch={onSearchProduct}
        filterOption={false}
        options={productOpts}
        onChange={(v, opt) => {
          const o = (opt as { product: { code: string; name: string; standard_cost: number } }).product;
          updateLine(row.key, { product_id: v, product_code: o?.code, product_name: o?.name, rate: row.rate || (o?.standard_cost ?? 0) });
        }}
      />
    )},
    { title: 'Current', key: 'current_qty', width: 110,
      render: (_: unknown, row: LineRow) => (
        <InputNumber disabled={readOnly} value={row.current_qty} onChange={(v) => updateLine(row.key, { current_qty: Number(v ?? 0) })} step={0.001} style={{ width: '100%' }} />
      ) },
    { title: 'Counted', key: 'counted_qty', width: 110,
      render: (_: unknown, row: LineRow) => (
        <InputNumber disabled={readOnly} value={row.counted_qty} onChange={(v) => updateLine(row.key, { counted_qty: Number(v ?? 0) })} step={0.001} style={{ width: '100%' }} />
      ) },
    { title: 'Diff', key: 'difference', width: 110, align: 'right' as const,
      render: (_: unknown, row: LineRow) => {
        const d = (row.counted_qty || 0) - (row.current_qty || 0);
        return <Typography.Text strong style={{ color: d >= 0 ? '#3f8600' : '#cf1322' }}>{d >= 0 ? '+' : ''}{d.toFixed(3)}</Typography.Text>;
      }
    },
    { title: 'Rate', key: 'rate', width: 110,
      render: (_: unknown, row: LineRow) => (
        <InputNumber disabled={readOnly} value={row.rate} onChange={(v) => updateLine(row.key, { rate: Number(v ?? 0) })} step={0.01} style={{ width: '100%' }} />
      ) },
    { title: 'Batch', key: 'batch_no', width: 140,
      render: (_: unknown, row: LineRow) => <Input disabled={readOnly} value={row.batch_no} onChange={(e) => updateLine(row.key, { batch_no: e.target.value })} /> },
    { title: '', key: 'rm', width: 50,
      render: (_: unknown, row: LineRow) => (
        <Button danger size="small" icon={<DeleteOutlined />} disabled={readOnly} onClick={() => removeLine(row.key)} />
      ) },
  ];

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing ? `Adjustment ${adj?.code ?? ''}` : 'New stock adjustment'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/stock/adjustments')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && editing && <Button icon={<SendOutlined />}
              onClick={() => confirmDelete({ title: 'Submit for approval?', okText: 'Yes, submit', danger: false, onOk: onSubmit })}>Submit</Button>}
            {status === 'submitted' && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Approve & post to ledger?', content: 'Stock movements will be written.', okText: 'Yes, approve', danger: false, onOk: onApprove })}>Approve</Button>}
            {status && status !== 'cancelled' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this adjustment?', content: 'Posted ledger rows will be reversed.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>

        {readOnly && <Alert type="info" showIcon message={`This adjustment is ${status} — fields are read-only.`} />}

        <Form form={form} layout="vertical" initialValues={{ adjustment_date: dayjs(), reason: 'physical_count' }}>
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Form.Item label="Adj #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="stock_adjustment" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Warehouse" name="warehouse_id" rules={[{ required: true }]}>
                <Select disabled={readOnly} options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}><Form.Item label="Date" name="adjustment_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={6}>
              <Form.Item label="Reason" name="reason" rules={[{ required: true }]}>
                <Select disabled={readOnly} options={[
                  { value: 'physical_count', label: 'Physical count' },
                  { value: 'damage', label: 'Damage' },
                  { value: 'expiry', label: 'Expired' },
                  { value: 'theft', label: 'Theft / loss' },
                  { value: 'production_loss', label: 'Production loss' },
                  { value: 'opening_correction', label: 'Opening correction' },
                  { value: 'other', label: 'Other' },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Text strong>Lines</Typography.Text>
          {!readOnly && <Button icon={<PlusOutlined />} onClick={addLine}>Add product</Button>}
        </Space>

        <Table<LineRow> rowKey="key" dataSource={lines} columns={columns} pagination={false} size="small" />
      </Space>
    </Card>
  );
}
