import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { interCompanyApi } from '../api/interCompanyApi';
import { companyApi } from '../../02-companies/api/companyApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { productApi } from '../../05-products/api/productsApi';
import type { IciLine, IciStatus, InterCompanyInvoice } from '../types/intercompany.types';

interface HeaderShape {
  code?: string;
  from_company_id: number;
  to_company_id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  invoice_date: Dayjs;
  due_date?: Dayjs;
  currency: string;
  exchange_rate: number;
  profit_pct: number;
  notes?: string;
}

interface LineRow {
  key: string;
  id?: number;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  hsn_code?: string;
  qty: number;
  cost_rate: number;
  sell_rate: number;
  tax_rate: number;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
}

interface ProductOption { value: number; label: string; product: { code: string; name: string; hsn_code: string; standard_cost: number } }

function IciProductPicker({ value, fallbackLabel, readOnly, onPick }: {
  value?: number; fallbackLabel?: string; readOnly: boolean;
  onPick: (opt: ProductOption) => void;
}) {
  const [opts, setOpts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const handleSearch = async (q: string) => {
    if (!q) return;
    setLoading(true);
    try {
      const list = await productApi.lookup(q, undefined, undefined, 20);
      setOpts(list.map((p) => ({
        value: Number(p.id),
        label: `${p.code} — ${p.name}`,
        product: { code: String(p.code), name: String(p.name), hsn_code: String((p as { hsn_code?: string | null }).hsn_code ?? ''), standard_cost: Number((p as { standard_cost?: number }).standard_cost ?? 0) },
      })));
    } finally { setLoading(false); }
  };
  return (
    <Select
      showSearch style={{ width: 280 }} placeholder="Search product..."
      disabled={readOnly} value={value ?? undefined}
      defaultActiveFirstOption={false} filterOption={false} loading={loading}
      onSearch={handleSearch}
      options={value && opts.length === 0 && fallbackLabel ? [{ value, label: fallbackLabel, product: { code: '', name: '', hsn_code: '', standard_cost: 0 } }] : opts}
      onChange={(_, opt) => onPick(opt as ProductOption)}
    />
  );
}

function recalcSell(cost: number, profitPct: number): number {
  return Math.round((cost * (1 + profitPct / 100)) * 10000) / 10000;
}

export default function InterCompanyInvoiceFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [ici, setIci] = useState<InterCompanyInvoice | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [companies, setCompanies] = useState<Array<{ value: number; label: string }>>([]);
  const [fromWh, setFromWh] = useState<Array<{ value: number; label: string }>>([]);
  const [toWh, setToWh] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [profitPct, setProfitPct] = useState(0);

  useEffect(() => {
    companyApi.list({ per_page: 100 }).then((r) => setCompanies(r.data.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    interCompanyApi.get(Number(id)).then((x) => {
      setIci(x);
      setProfitPct(x.profit_pct);
      form.setFieldsValue({
        code: x.code,
        from_company_id: x.from_company_id, to_company_id: x.to_company_id,
        from_warehouse_id: x.from_warehouse_id, to_warehouse_id: x.to_warehouse_id,
        invoice_date: dayjs(x.invoice_date),
        due_date: x.due_date ? dayjs(x.due_date) : undefined,
        currency: x.currency, exchange_rate: x.exchange_rate,
        profit_pct: x.profit_pct, notes: x.notes ?? undefined,
      });
      void loadWarehousesFor(x.from_company_id, 'from');
      void loadWarehousesFor(x.to_company_id, 'to');
      setLines((x.lines ?? []).map((l: IciLine, i: number) => ({
        key: `e-${l.id ?? i}`, id: l.id,
        product_id: l.product_id, product_code: l.product?.code, product_name: l.product?.name,
        hsn_code: (l as { hsn_code?: string | null }).hsn_code ?? undefined,
        qty: Number(l.qty), cost_rate: Number(l.cost_rate), sell_rate: Number(l.sell_rate), tax_rate: Number(l.tax_rate),
        batch_no: l.batch_no ?? undefined, expiry_date: l.expiry_date ?? undefined, notes: l.notes ?? undefined,
      })));
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const loadWarehousesFor = async (companyId: number, side: 'from' | 'to') => {
    if (!companyId) return;
    try {
      const r = await warehouseApi.list(companyId, { per_page: 200 });
      const opts = r.data.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }));
      if (side === 'from') setFromWh(opts); else setToWh(opts);
    } catch { /* ignore */ }
  };

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((rows) => rows.map((r) => {
      if (r.key !== key) return r;
      const merged = { ...r, ...patch };
      if (patch.cost_rate !== undefined && patch.sell_rate === undefined) {
        merged.sell_rate = recalcSell(merged.cost_rate, profitPct);
      }
      return merged;
    }));
  };
  const removeLine = (key: string) => setLines((rows) => rows.filter((r) => r.key !== key));
  const addLine = () => setLines((rows) => [...rows, { key: `n-${Date.now()}-${Math.random()}`, qty: 1, cost_rate: 0, sell_rate: 0, tax_rate: 0 }]);

  const onProfitChange = (v: number | null) => {
    const pct = Number(v ?? 0);
    setProfitPct(pct);
    setLines((rows) => rows.map((r) => ({ ...r, sell_rate: recalcSell(r.cost_rate, pct) })));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        from_company_id: v.from_company_id, to_company_id: v.to_company_id,
        from_warehouse_id: v.from_warehouse_id, to_warehouse_id: v.to_warehouse_id,
        invoice_date: v.invoice_date.format('YYYY-MM-DD'),
        due_date: v.due_date?.format('YYYY-MM-DD'),
        currency: v.currency ?? 'INR', exchange_rate: v.exchange_rate ?? 1,
        profit_pct: v.profit_pct ?? 0, notes: v.notes,
        lines: lines.filter((l) => l.product_id && l.qty > 0).map((l) => ({
          product_id: l.product_id!,
          hsn_code: l.hsn_code,
          qty: l.qty, cost_rate: l.cost_rate, sell_rate: l.sell_rate,
          tax_rate: l.tax_rate, batch_no: l.batch_no, expiry_date: l.expiry_date, notes: l.notes,
        })),
      };
      if (payload.lines.length === 0) { message.error('Add at least one line.'); return; }
      if (editing && ici) { await interCompanyApi.update(ici.id, payload); message.success('Saved.'); }
      else {
        const created = await interCompanyApi.create(payload);
        message.success('ICI created.');
        navigate(`/inter-company-invoices/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onPost = async () => { if (!ici) return; try { setIci(await interCompanyApi.post(ici.id)); message.success('Posted — stock moved + mirror invoices created.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Post failed.'); } };
  const onCancel = async () => { if (!ici) return; try { setIci(await interCompanyApi.cancel(ici.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const status: IciStatus | undefined = ici?.status;
  const readOnly = !!status && status !== 'draft';
  const totals = lines.reduce((acc, l) => {
    const sub = (l.qty || 0) * (l.sell_rate || 0);
    const tax = sub * (l.tax_rate || 0) / 100;
    return { sub: acc.sub + sub, tax: acc.tax + tax, total: acc.total + sub + tax, cost: acc.cost + (l.qty || 0) * (l.cost_rate || 0) };
  }, { sub: 0, tax: 0, total: 0, cost: 0 });

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `ICI ${ici?.code ?? ''}` : 'New inter-company invoice'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/inter-company-invoices')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && ici && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Post this inter-company invoice?', content: 'Moves stock between warehouses + creates Sale and Purchase invoices on both companies.', okText: 'Yes, post', danger: false, onOk: onPost })}>Post</Button>}
            {status && status !== 'cancelled' && ici && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this ICI?', content: 'Reverses ALL 4 effects: stock OUT, stock IN, sale invoice, purchase invoice.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>

        {status === 'posted' && (
          <Alert type="success" showIcon message={
            <span>
              Posted. Linked sale invoice: {ici?.linked_sale_invoice ? <Link to={`/invoices/${ici.linked_sale_invoice.id}`}>{ici.linked_sale_invoice.code}</Link> : '—'}
              {' '}· Linked purchase invoice (PI on buyer side): {ici?.linked_purchase_invoice ? <Tag>{ici.linked_purchase_invoice.code}</Tag> : '—'}
            </span>
          } />
        )}
        {status === 'cancelled' && <Alert type="error" showIcon message="Cancelled. All stock + invoice effects reversed." />}

        <Form form={form} layout="vertical" initialValues={{ invoice_date: dayjs(), currency: 'INR', exchange_rate: 1, profit_pct: 0 }}>
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="ICI #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="inter_company_invoice" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}><Form.Item label="From company (seller)" name="from_company_id" rules={[{ required: true }]}>
              <Select disabled={readOnly} options={companies} onChange={(v) => loadWarehousesFor(Number(v), 'from')} />
            </Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="From warehouse (OUT)" name="from_warehouse_id" rules={[{ required: true }]}><Select disabled={readOnly} options={fromWh} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="To company (buyer)" name="to_company_id" rules={[{ required: true }]}>
              <Select disabled={readOnly} options={companies} onChange={(v) => loadWarehousesFor(Number(v), 'to')} />
            </Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="To warehouse (IN)" name="to_warehouse_id" rules={[{ required: true }]}><Select disabled={readOnly} options={toWh} /></Form.Item></Col>

            <Col xs={12} md={4}><Form.Item label="Invoice date" name="invoice_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Due date" name="due_date"><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Exchange rate" name="exchange_rate" rules={[{ required: true }]}><InputNumber min={0.000001} step={0.0001} disabled={readOnly} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Profit %" name="profit_pct" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.5} disabled={readOnly} style={{ width: '100%' }} onChange={onProfitChange} />
            </Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        <Typography.Text strong>Lines</Typography.Text>
        <Table
          rowKey="key"
          dataSource={lines}
          size="small"
          pagination={false}
          columns={[
            { title: 'Product', key: 'p', render: (_: unknown, r: LineRow) => (
              <IciProductPicker
                value={r.product_id} readOnly={readOnly}
                fallbackLabel={r.product_code ? `${r.product_code} — ${r.product_name ?? ''}` : undefined}
                onPick={(o) => updateLine(r.key, { product_id: o.value, product_code: o.product.code, product_name: o.product.name, hsn_code: r.hsn_code || o.product.hsn_code, cost_rate: r.cost_rate || o.product.standard_cost || 0 })}
              />
            )},
            { title: 'HSN/SAC', key: 'h', width: 110, render: (_: unknown, r: LineRow) => (
              <Input disabled={readOnly} value={r.hsn_code} placeholder="e.g. 3004" maxLength={16} onChange={(e) => updateLine(r.key, { hsn_code: e.target.value })} />
            )},
            { title: 'Qty', key: 'q', width: 100, render: (_: unknown, r: LineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.001} value={r.qty} onChange={(v) => updateLine(r.key, { qty: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Cost rate', key: 'cr', width: 110, render: (_: unknown, r: LineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.01} value={r.cost_rate} onChange={(v) => updateLine(r.key, { cost_rate: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Sell rate', key: 'sr', width: 110, render: (_: unknown, r: LineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.01} value={r.sell_rate} onChange={(v) => updateLine(r.key, { sell_rate: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Tax %', key: 'tx', width: 90, render: (_: unknown, r: LineRow) => (
              <InputNumber disabled={readOnly} min={0} max={100} step={0.5} value={r.tax_rate} onChange={(v) => updateLine(r.key, { tax_rate: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Subtotal', key: 'sb', align: 'right' as const, width: 110, render: (_: unknown, r: LineRow) => ((r.qty || 0) * (r.sell_rate || 0)).toFixed(2) },
            { title: 'Batch', key: 'b', width: 130, render: (_: unknown, r: LineRow) => (
              <Input disabled={readOnly} value={r.batch_no} onChange={(e) => updateLine(r.key, { batch_no: e.target.value })} />
            )},
            { title: '', key: 'rm', width: 50, render: (_: unknown, r: LineRow) => readOnly ? null : (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeLine(r.key)} />
            )},
          ]}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><strong>Cost basis: {totals.cost.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={3} align="right"><strong>Subtotal: {totals.sub.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right"><strong>{totals.sub.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={2} align="right"><strong>Tax {totals.tax.toFixed(2)} · Total {totals.total.toFixed(2)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
        {!readOnly && <Button icon={<PlusOutlined />} onClick={addLine}>Add product</Button>}
      </Space>
    </Card>
  );
}
