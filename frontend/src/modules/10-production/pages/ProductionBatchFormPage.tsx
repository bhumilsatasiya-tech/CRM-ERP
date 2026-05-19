import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Tabs, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CheckOutlined, CloseOutlined, NodeIndexOutlined, PlayCircleOutlined, SendOutlined, ToolOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { productionApi } from '../api/productionApi';
import { formulaApi } from '../../12-formula/api/formulaApi';
import { salesOrderApi } from '../../09-sales/api/salesApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import { productApi } from '../../05-products/api/productsApi';
import { useAppSelector } from '../../../app/hooks';
import ProductionInputsEditor, { type InputRow } from '../components/ProductionInputsEditor';
import ProductionOutputsEditor, { type OutputRow } from '../components/ProductionOutputsEditor';
import QualityChecksTab from '../components/QualityChecksTab';
import CompleteBatchModal from '../components/CompleteBatchModal';
import type { ProductionBatch, ProductionStatus } from '../types/production.types';

interface HeaderShape {
  code?: string;
  stage?: 'trial' | 'final' | 'qc';
  parent_batch_id?: number | null;
  target_product_id: number;
  qty_planned: number;
  raw_warehouse_id: number;
  finished_warehouse_id: number;
  sales_order_id?: number | null;
  planned_start_date: Dayjs;
  planned_end_date?: Dayjs;
  output_batch_no?: string;
  output_expiry_date?: Dayjs;
  notes?: string;
}

export default function ProductionBatchFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromSoId = params.get('from_so');
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);

  const [form] = Form.useForm<HeaderShape>();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [inputs, setInputs] = useState<InputRow[]>([]);
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ value: number; label: string }>>([]);
  const [targetOpts, setTargetOpts] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [prefilledFrom, setPrefilledFrom] = useState<{ id: number; code: string } | null>(null);

  useEffect(() => {
    if (activeCompanyId) {
      warehouseApi.list(activeCompanyId, { per_page: 200 })
        .then((r) => setWarehouses(r.data.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))))
        .catch(() => undefined);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    productionApi.get(Number(id)).then((b) => {
      setBatch(b);
      form.setFieldsValue({
        code: b.code,
        stage: (b as { stage?: 'trial' | 'final' | 'qc' }).stage ?? 'final',
        parent_batch_id: (b as { parent_batch_id?: number | null }).parent_batch_id ?? undefined,
        target_product_id: b.target_product_id,
        qty_planned: Number(b.qty_planned),
        raw_warehouse_id: b.raw_warehouse_id,
        finished_warehouse_id: b.finished_warehouse_id,
        sales_order_id: b.sales_order_id ?? undefined,
        planned_start_date: dayjs(b.planned_start_date),
        planned_end_date: b.planned_end_date ? dayjs(b.planned_end_date) : undefined,
        output_batch_no: b.output_batch_no ?? undefined,
        output_expiry_date: b.output_expiry_date ? dayjs(b.output_expiry_date) : undefined,
        notes: b.notes ?? undefined,
      });
      if (b.target_product) setTargetOpts([{ value: b.target_product.id, label: `${b.target_product.code} — ${b.target_product.name}` }]);
      setInputs((b.inputs ?? []).map((l, i) => ({
        key: `e-${l.id ?? i}`, id: l.id,
        product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        qty_planned: Number(l.qty_planned), rate: Number(l.rate),
        source_batch_no: l.source_batch_no ?? undefined,
        notes: l.notes ?? undefined,
      })));
      setOutputs((b.outputs ?? []).map((l, i) => ({
        key: `e-${l.id ?? i}`, id: l.id,
        product_id: l.product_id,
        product_code: l.product?.code, product_name: l.product?.name,
        output_type: l.output_type,
        qty_planned: Number(l.qty_planned), rate: Number(l.rate),
        output_batch_no: l.output_batch_no ?? undefined,
        expiry_date: l.expiry_date ?? undefined,
        notes: l.notes ?? undefined,
      })));
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  // Prefill new batch from a Sales Order
  useEffect(() => {
    if (editing) return;
    if (!fromSoId) return;
    (async () => {
      try {
        const so = await salesOrderApi.get(Number(fromSoId));
        // Pick first SO line as the target (production batches generally make one finished product at a time)
        const firstLine = (so.lines ?? [])[0];
        if (!firstLine) {
          message.warning('SO has no lines to seed from.');
          return;
        }
        const remainingQty = (so.lines ?? []).reduce((sum, l) => {
          const ord = Number(l.qty) || 0; const inv = Number(l.invoiced_qty ?? 0);
          return sum + Math.max(0, ord - inv);
        }, 0);
        form.setFieldsValue({
          target_product_id: firstLine.product_id,
          qty_planned: remainingQty > 0 ? remainingQty : Number(firstLine.qty),
          sales_order_id: so.id,
          planned_start_date: dayjs(),
        });
        if (firstLine.product) {
          setTargetOpts([{ value: firstLine.product.id, label: `${firstLine.product.code} — ${firstLine.product.name}` }]);
        }
        setPrefilledFrom({ id: so.id, code: so.code });
      } catch { message.error('Could not prefill from SO.'); }
    })();
  }, [editing, fromSoId, form]);

  const onSearchTarget = async (q: string) => {
    if (!q) return;
    const list = await productApi.lookup(q, 'finished', undefined, 20);
    setTargetOpts(list.map((p) => ({ value: Number(p.id), label: `${p.code} — ${p.name}` })));
  };

  const buildPayload = () => {
    const v = form.getFieldsValue();
    return {
      code: v.code,
      stage: v.stage ?? 'final',
      parent_batch_id: v.parent_batch_id ?? null,
      target_product_id: v.target_product_id,
      qty_planned: v.qty_planned,
      raw_warehouse_id: v.raw_warehouse_id,
      finished_warehouse_id: v.finished_warehouse_id,
      sales_order_id: v.sales_order_id ?? null,
      planned_start_date: v.planned_start_date.format('YYYY-MM-DD'),
      planned_end_date: v.planned_end_date?.format('YYYY-MM-DD'),
      output_batch_no: v.output_batch_no,
      output_expiry_date: v.output_expiry_date?.format('YYYY-MM-DD'),
      notes: v.notes,
      inputs: inputs.filter((r) => r.product_id && r.qty_planned > 0).map((r) => ({
        product_id: r.product_id!,
        qty_planned: r.qty_planned,
        rate: r.rate,
        source_batch_no: r.source_batch_no,
        notes: r.notes,
      })),
      outputs: outputs.filter((r) => r.product_id && r.qty_planned > 0).map((r) => ({
        product_id: r.product_id!,
        output_type: r.output_type,
        qty_planned: r.qty_planned,
        rate: r.rate,
        output_batch_no: r.output_batch_no,
        expiry_date: r.expiry_date,
        notes: r.notes,
      })),
    };
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await form.validateFields();
      const payload = buildPayload();
      if (payload.inputs.length === 0)  { message.error('Add at least one input line.'); return; }
      if (payload.outputs.length === 0) { message.error('Add at least one output line.'); return; }
      if (editing && batch) {
        const updated = await productionApi.update(batch.id, payload);
        setBatch(updated);
        message.success('Saved.');
      } else {
        const created = await productionApi.create(payload);
        message.success('Batch created.');
        navigate(`/production-batches/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const wrap = async (action: () => Promise<ProductionBatch>, label: string) => {
    try { setBatch(await action()); message.success(`${label}.`); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? `${label} failed.`);
    }
  };

  const status: ProductionStatus | undefined = batch?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing ? `Production batch ${batch?.code ?? ''}` : 'New production batch'}
            {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/production-batches')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft'      && batch && <Button icon={<SendOutlined />}
              onClick={() => confirmDelete({ title: 'Submit batch for approval?', okText: 'Yes, submit', danger: false, onOk: () => wrap(() => productionApi.submit(batch.id), 'Submitted') })}>Submit</Button>}
            {status === 'submitted'  && batch && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Approve this batch?', okText: 'Yes, approve', danger: false, onOk: () => wrap(() => productionApi.approve(batch.id), 'Approved') })}>Approve</Button>}
            {status === 'approved'   && batch && <Button type="primary" icon={<PlayCircleOutlined />}
              onClick={() => confirmDelete({ title: 'Start production?', okText: 'Yes, start', danger: false, onOk: () => wrap(() => productionApi.start(batch.id), 'Started') })}>Start</Button>}
            {(status === 'approved' || status === 'in_progress') && batch && (
              <Button type="primary" icon={<ToolOutlined />} onClick={() => setCompleteOpen(true)}>Complete</Button>
            )}
            {batch?.sales_order_id && (
              <Button icon={<NodeIndexOutlined />} onClick={() => navigate(`/tracking/sales-orders/${batch.sales_order_id}`)}>Trace SO</Button>
            )}
            {status && status !== 'cancelled' && batch && (
              <Button danger icon={<CloseOutlined />}
                onClick={() => confirmDelete({
                  title: 'Cancel this batch?',
                  content: 'If the batch was completed, all stock movements will be reversed.',
                  okText: 'Yes, cancel',
                  onOk: () => wrap(() => productionApi.cancel(batch.id, 'Cancelled by user'), 'Cancelled'),
                })}>Cancel</Button>
            )}
          </Space>
        </Space>

        {prefilledFrom && (
          <Alert type="info" showIcon message={
            <span>Prefilled from sales order <Link to={`/sales-orders/${prefilledFrom.id}`}>{prefilledFrom.code}</Link>. You can adjust before saving.</span>
          } />
        )}
        {batch?.sales_order && (
          <Alert type="info" showIcon message={
            <span>Linked to sales order <Link to={`/sales-orders/${batch.sales_order.id}`}>{batch.sales_order.code}</Link>.</span>
          } />
        )}
        {status === 'completed' && (
          <Alert type="success" showIcon
            message={`Batch completed. Produced ${Number(batch?.qty_produced).toFixed(3)}, scrap ${Number(batch?.qty_failed).toFixed(3)}, material cost ${Number(batch?.material_cost).toFixed(2)}.`}
          />
        )}
        {status === 'cancelled' && (
          <Alert type="error" showIcon message="Batch cancelled. If it was completed, all stock movements have been reversed." />
        )}

        <Tabs defaultActiveKey="planning" items={[
          {
            key: 'planning', label: 'Planning',
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {!readOnly && (
                  <Button onClick={async () => {
                    const v = form.getFieldsValue();
                    if (!v.target_product_id || !v.qty_planned) {
                      message.warning('Pick target product and qty first.');
                      return;
                    }
                    try {
                      const r = await formulaApi.scale(Number(v.target_product_id), Number(v.qty_planned));
                      if (!r.formula) { message.warning(r.message ?? 'No active formula found.'); return; }
                      setInputs(r.inputs.map((row, i) => ({
                        key: `f-${i}`,
                        product_id: row.product_id,
                        product_code: row.product_code,
                        product_name: row.product_name,
                        qty_planned: row.qty_planned,
                        rate: row.rate,
                        source_batch_no: row.source_batch_no ?? undefined,
                        notes: row.notes ?? undefined,
                      })));
                      message.success(`Scaffolded from formula ${r.formula.code} v${r.formula.version}.`);
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: { message?: string } } };
                      message.error(err.response?.data?.message ?? 'Scaffold failed.');
                    }
                  }}>Use formula (auto-fill inputs)</Button>
                )}
                <Form form={form} layout="vertical" initialValues={{ planned_start_date: dayjs(), qty_planned: 1, stage: 'final' }}>
                  <Row gutter={16}>
                    <Col xs={12} md={4}>
                      <Form.Item label="Batch #" name="code" extra="auto from sequence — edit to override">
                        <DocumentNumberField docType="batch" editing={editing} disabled={readOnly} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item label="Stage" name="stage" rules={[{ required: true }]} extra="Trial = R&D (no FG IN); QC = inspection only">
                        <Select disabled={readOnly} options={[
                          { value: 'trial', label: 'Trial' },
                          { value: 'final', label: 'Final' },
                          { value: 'qc',    label: 'QC' },
                        ]} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item label="Parent batch ID" name="parent_batch_id" extra="Link Final → Trial, or QC → Final">
                        <InputNumber min={1} disabled={readOnly} style={{ width: '100%' }} placeholder="(optional)" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item label="Target product (finished)" name="target_product_id" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Search finished product..." disabled={readOnly} filterOption={false} onSearch={onSearchTarget} options={targetOpts} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item label="Qty planned" name="qty_planned" rules={[{ required: true }]}>
                        <InputNumber min={0.001} step={0.001} disabled={readOnly} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={5}>
                      <Form.Item label="Plan start" name="planned_start_date" rules={[{ required: true }]}>
                        <DatePicker disabled={readOnly} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={5}>
                      <Form.Item label="Plan end" name="planned_end_date">
                        <DatePicker disabled={readOnly} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Raw warehouse (OUT source)" name="raw_warehouse_id" rules={[{ required: true }]}>
                        <Select disabled={readOnly} options={warehouses} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Finished warehouse (IN destination)" name="finished_warehouse_id" rules={[{ required: true }]}>
                        <Select disabled={readOnly} options={warehouses} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item label="Output batch no." name="output_batch_no">
                        <Input disabled={readOnly} placeholder="Default for outputs" />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item label="Output expiry" name="output_expiry_date">
                        <DatePicker disabled={readOnly} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Notes" name="notes">
                        <Input.TextArea rows={2} disabled={readOnly} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>

                <Divider />

                <ProductionInputsEditor rows={inputs} onChange={setInputs} readOnly={readOnly} />

                <Divider />

                <ProductionOutputsEditor rows={outputs} onChange={setOutputs} readOnly={readOnly} />
              </Space>
            ),
          },
          {
            key: 'qc', label: 'Quality checks',
            children: batch ? (
              <QualityChecksTab batch={batch} onChange={setBatch} readOnly={status === 'cancelled'} />
            ) : <Alert type="info" message="Save the batch before recording quality checks." />,
          },
        ]} />
      </Space>

      {batch && (
        <CompleteBatchModal
          open={completeOpen}
          batch={batch}
          onCancel={() => setCompleteOpen(false)}
          onCompleted={(b) => { setBatch(b); setCompleteOpen(false); }}
        />
      )}
    </Card>
  );
}
