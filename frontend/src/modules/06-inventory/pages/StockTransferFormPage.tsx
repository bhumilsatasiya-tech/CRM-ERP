import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { stockTransferApi } from '../api/inventoryApi';
import { productApi } from '../../05-products/api/productsApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { useAppSelector } from '../../../app/hooks';
import type { StockTransfer, TransferStatus } from '../types/inventory.types';

interface LineRow {
  key: string;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  qty: number;
  rate: number;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
}

export default function StockTransferFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);

  const [form] = Form.useForm<{ code?: string; from_warehouse_id: number; to_warehouse_id: number; transfer_date: Dayjs; expected_arrival_date?: Dayjs; notes?: string }>();
  const [tr, setTr] = useState<StockTransfer | null>(null);
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
    stockTransferApi.get(Number(id))
      .then((t) => {
        setTr(t);
        form.setFieldsValue({
          code: t.code,
          from_warehouse_id: t.from_warehouse_id,
          to_warehouse_id: t.to_warehouse_id,
          transfer_date: dayjs(t.transfer_date),
          expected_arrival_date: t.expected_arrival_date ? dayjs(t.expected_arrival_date) : undefined,
          notes: t.notes ?? undefined,
        });
        setLines((t.lines ?? []).map((l, idx) => ({
          key: `existing-${l.id ?? idx}`,
          product_id: l.product_id,
          product_code: l.product?.code,
          product_name: l.product?.name,
          qty: Number(l.qty),
          rate: Number(l.rate),
          batch_no: l.batch_no ?? undefined,
          expiry_date: l.expiry_date ?? undefined,
          notes: l.notes ?? undefined,
        })));
      })
      .catch(() => message.error('Failed to load transfer.'))
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

  const addLine = () => setLines((prev) => [...prev, { key: `new-${Date.now()}`, qty: 0, rate: 0 }]);
  const updateLine = (key: string, patch: Partial<LineRow>) =>
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, ...patch } : l));
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        from_warehouse_id: v.from_warehouse_id,
        to_warehouse_id: v.to_warehouse_id,
        transfer_date: v.transfer_date.format('YYYY-MM-DD'),
        expected_arrival_date: v.expected_arrival_date?.format('YYYY-MM-DD'),
        notes: v.notes,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!, qty: l.qty, rate: l.rate,
          batch_no: l.batch_no, expiry_date: l.expiry_date, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && tr) {
        await stockTransferApi.update(tr.id, payload);
        message.success('Saved.');
      } else {
        const created = await stockTransferApi.create(payload);
        message.success('Transfer created.');
        navigate(`/stock/transfers/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onSend = async () => { if (!tr) return; try { setTr(await stockTransferApi.send(tr.id)); message.success('Sent. Goods are now in transit.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Send failed.'); } };
  const onReceive = async () => { if (!tr) return; try { setTr(await stockTransferApi.receive(tr.id)); message.success('Received at destination.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Receive failed.'); } };
  const onCancel = async () => { if (!tr) return; try { setTr(await stockTransferApi.cancel(tr.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const status: TransferStatus | undefined = tr?.status;
  const readOnly = !!status && status !== 'draft';

  const columns = [
    { title: 'Product', key: 'product', render: (_: unknown, row: LineRow) => (
      <Select showSearch placeholder="Search product..." allowClear style={{ width: 320 }}
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
    { title: 'Qty', key: 'qty', width: 130, render: (_: unknown, row: LineRow) => (
      <InputNumber disabled={readOnly} value={row.qty} onChange={(v) => updateLine(row.key, { qty: Number(v ?? 0) })} step={0.001} min={0} style={{ width: '100%' }} />
    )},
    { title: 'Rate', key: 'rate', width: 130, render: (_: unknown, row: LineRow) => (
      <InputNumber disabled={readOnly} value={row.rate} onChange={(v) => updateLine(row.key, { rate: Number(v ?? 0) })} step={0.01} min={0} style={{ width: '100%' }} />
    )},
    { title: 'Batch', key: 'batch', width: 160, render: (_: unknown, row: LineRow) => (
      <Input disabled={readOnly} value={row.batch_no} onChange={(e) => updateLine(row.key, { batch_no: e.target.value })} />
    )},
    { title: '', key: 'rm', width: 50, render: (_: unknown, row: LineRow) => (
      <Button danger size="small" icon={<DeleteOutlined />} disabled={readOnly} onClick={() => removeLine(row.key)} />
    )},
  ];

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing ? `Transfer ${tr?.code ?? ''}` : 'New stock transfer'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/stock/transfers')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && editing && <Button icon={<SendOutlined />}
              onClick={() => confirmDelete({ title: 'Send transfer?', content: 'Stock will leave the source warehouse.', okText: 'Yes, send', danger: false, onOk: onSend })}>Send</Button>}
            {status === 'sent' && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Mark received at destination?', okText: 'Yes, receive', danger: false, onOk: onReceive })}>Receive</Button>}
            {status && status !== 'cancelled' && status !== 'received' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this transfer?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>

        {status === 'sent' && <Alert type="warning" showIcon message="Goods are in transit. Click Receive when they arrive at the destination." />}
        {status === 'received' && <Alert type="success" showIcon message="Transfer completed." />}
        {status === 'cancelled' && <Alert type="error" showIcon message={`Cancelled${tr?.cancellation_reason ? ` — ${tr.cancellation_reason}` : ''}.`} />}

        <Form form={form} layout="vertical" initialValues={{ transfer_date: dayjs() }}>
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Form.Item label="Transfer #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="stock_transfer" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="From warehouse" name="from_warehouse_id" rules={[{ required: true }]}>
                <Select disabled={readOnly} options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="To warehouse" name="to_warehouse_id" rules={[{ required: true }]}>
                <Select disabled={readOnly} options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))} />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}><Form.Item label="Transfer date" name="transfer_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Expected arrival" name="expected_arrival_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
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
