import { useEffect, useState } from 'react';
import { Alert, DatePicker, Input, InputNumber, Modal, Space, Table, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { productionApi, type CompletePayload } from '../api/productionApi';
import type { ProductionBatch } from '../types/production.types';

interface InRow { id: number; name: string; planned: number; consumed: number; rate: number; source_batch_no?: string }
interface OutRow { id: number; name: string; type: string; planned: number; produced: number; rate: number; output_batch_no?: string; expiry_date?: string }

interface Props {
  open: boolean;
  batch: ProductionBatch;
  onCancel: () => void;
  onCompleted: (b: ProductionBatch) => void;
}

export default function CompleteBatchModal({ open, batch, onCancel, onCompleted }: Props) {
  const [inputs, setInputs]   = useState<InRow[]>([]);
  const [outputs, setOutputs] = useState<OutRow[]>([]);
  const [endAt, setEndAt]     = useState<Dayjs>(dayjs());
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!open) return;
    setInputs((batch.inputs ?? []).map((l) => ({
      id: l.id!, name: l.product?.name ?? `Product ${l.product_id}`,
      planned: Number(l.qty_planned), consumed: Number(l.qty_planned),
      rate: Number(l.rate),
      source_batch_no: l.source_batch_no ?? undefined,
    })));
    setOutputs((batch.outputs ?? []).map((l) => ({
      id: l.id!, name: l.product?.name ?? `Product ${l.product_id}`,
      type: l.output_type,
      planned: Number(l.qty_planned), produced: Number(l.qty_planned),
      rate: Number(l.rate),
      output_batch_no: l.output_batch_no ?? batch.output_batch_no ?? undefined,
      expiry_date: l.expiry_date ?? batch.output_expiry_date ?? undefined,
    })));
    setEndAt(dayjs());
  }, [open, batch]);

  const onOk = async () => {
    setSaving(true);
    try {
      const payload: CompletePayload = {
        actual_end_date: endAt.toISOString(),
        inputs: inputs.map((i) => ({
          id: i.id,
          qty_consumed: i.consumed,
          rate: i.rate,
          source_batch_no: i.source_batch_no || null,
        })),
        outputs: outputs.map((o) => ({
          id: o.id,
          qty_produced: o.produced,
          rate: o.rate,
          output_batch_no: o.output_batch_no || null,
          expiry_date: o.expiry_date || null,
        })),
      };
      const updated = await productionApi.complete(batch.id, payload);
      onCompleted(updated);
      message.success('Batch completed — stock OUT (raw) and IN (finished) recorded.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Complete failed.');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} title={`Complete batch ${batch.code}`} width={1100} onCancel={onCancel} onOk={onOk} okText="Complete" confirmLoading={saving}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert type="info" showIcon message="Confirm actual quantities. On OK we will write OUT rows from the raw warehouse and IN rows to the finished warehouse." />

        <Typography.Text strong>Inputs (raw materials to consume — OUT)</Typography.Text>
        <Table<InRow>
          rowKey="id"
          dataSource={inputs}
          size="small"
          pagination={false}
          columns={[
            { title: 'Product', dataIndex: 'name' },
            { title: 'Planned', dataIndex: 'planned', width: 110, align: 'right' as const, render: (v: number) => v.toFixed(4) },
            { title: 'Consumed', key: 'c', width: 130, render: (_: unknown, r) => (
              <InputNumber min={0} step={0.001} value={r.consumed} onChange={(v) => setInputs((rows) => rows.map((x) => x.id === r.id ? { ...x, consumed: Number(v ?? 0) } : x))} style={{ width: '100%' }} />
            )},
            { title: 'Rate', key: 'rt', width: 110, render: (_: unknown, r) => (
              <InputNumber min={0} step={0.01} value={r.rate} onChange={(v) => setInputs((rows) => rows.map((x) => x.id === r.id ? { ...x, rate: Number(v ?? 0) } : x))} style={{ width: '100%' }} />
            )},
            { title: 'Source batch', key: 'sb', width: 160, render: (_: unknown, r) => (
              <Input value={r.source_batch_no} onChange={(e) => setInputs((rows) => rows.map((x) => x.id === r.id ? { ...x, source_batch_no: e.target.value } : x))} placeholder="Optional" />
            )},
          ]}
        />

        <Typography.Text strong>Outputs (produced — IN)</Typography.Text>
        <Table<OutRow>
          rowKey="id"
          dataSource={outputs}
          size="small"
          pagination={false}
          columns={[
            { title: 'Product', dataIndex: 'name' },
            { title: 'Type', dataIndex: 'type', width: 100 },
            { title: 'Planned', dataIndex: 'planned', width: 110, align: 'right' as const, render: (v: number) => v.toFixed(4) },
            { title: 'Produced', key: 'p', width: 130, render: (_: unknown, r) => (
              <InputNumber min={0} step={0.001} value={r.produced} onChange={(v) => setOutputs((rows) => rows.map((x) => x.id === r.id ? { ...x, produced: Number(v ?? 0) } : x))} style={{ width: '100%' }} />
            )},
            { title: 'Rate (auto)', key: 'rt', width: 110, render: (_: unknown, r) => (
              <InputNumber min={0} step={0.01} value={r.rate} onChange={(v) => setOutputs((rows) => rows.map((x) => x.id === r.id ? { ...x, rate: Number(v ?? 0) } : x))} style={{ width: '100%' }} />
            )},
            { title: 'Output batch', key: 'ob', width: 150, render: (_: unknown, r) => (
              <Input value={r.output_batch_no} onChange={(e) => setOutputs((rows) => rows.map((x) => x.id === r.id ? { ...x, output_batch_no: e.target.value } : x))} />
            )},
            { title: 'Expiry', key: 'exp', width: 150, render: (_: unknown, r) => (
              <DatePicker value={r.expiry_date ? dayjs(r.expiry_date) : null} onChange={(d) => setOutputs((rows) => rows.map((x) => x.id === r.id ? { ...x, expiry_date: d ? d.format('YYYY-MM-DD') : undefined } : x))} style={{ width: '100%' }} />
            )},
          ]}
        />

        <Space>
          <Typography.Text>Actual end date:</Typography.Text>
          <DatePicker showTime value={endAt} onChange={(d) => d && setEndAt(d)} />
        </Space>
      </Space>
    </Modal>
  );
}
