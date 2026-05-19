import { useState } from 'react';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { productionApi } from '../api/productionApi';
import type { ProductionBatch, QcResult, QualityCheck } from '../types/production.types';
import { confirmDelete } from '../../common/confirmDelete';

interface Props {
  batch: ProductionBatch;
  onChange: (b: ProductionBatch) => void;
  readOnly?: boolean;
}

export default function QualityChecksTab({ batch, onChange, readOnly = false }: Props) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ checked_at: Dayjs; result: QcResult; parameter?: string; expected?: string; observed?: string; notes?: string }>();
  const [saving, setSaving] = useState(false);

  const onAdd = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const r = await productionApi.recordQc(batch.id, {
        checked_at: v.checked_at.toISOString(),
        result: v.result,
        parameter: v.parameter,
        expected: v.expected,
        observed: v.observed,
        notes: v.notes,
      });
      onChange(r.batch);
      setOpen(false);
      form.resetFields();
      message.success('QC recorded.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    } finally { setSaving(false); }
  };

  const onDelete = async (qcId: number) => {
    try {
      onChange(await productionApi.deleteQc(batch.id, qcId));
      message.success('QC deleted.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const checks = batch.quality_checks ?? [];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text strong>Quality checks</Typography.Text>
        {!readOnly && <Button icon={<PlusOutlined />} onClick={() => { form.setFieldsValue({ checked_at: dayjs(), result: 'pass' }); setOpen(true); }}>Add QC</Button>}
      </Space>
      <Table<QualityCheck>
        rowKey="id"
        dataSource={checks}
        size="small"
        pagination={false}
        columns={[
          { title: 'Date', dataIndex: 'checked_at', width: 170, render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
          { title: 'Result', dataIndex: 'result', width: 90, render: (v: QcResult) => <Tag color={v === 'pass' ? 'green' : 'red'}>{v}</Tag> },
          { title: 'Parameter', dataIndex: 'parameter' },
          { title: 'Expected', dataIndex: 'expected' },
          { title: 'Observed', dataIndex: 'observed' },
          { title: 'Notes', dataIndex: 'notes' },
          { title: '', key: 'rm', width: 60, render: (_: unknown, q) => readOnly ? null : (
            <Button danger size="small" icon={<DeleteOutlined />}
              onClick={() => confirmDelete({
                title: 'Delete this QC entry?',
                onOk: () => onDelete(q.id),
              })} />
          )},
        ]}
      />
      <Modal open={open} title="Record quality check" onCancel={() => setOpen(false)} onOk={onAdd} okText="Record" confirmLoading={saving}>
        <Form form={form} layout="vertical" initialValues={{ checked_at: dayjs(), result: 'pass' }}>
          <Form.Item label="Checked at" name="checked_at" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Result" name="result" rules={[{ required: true }]}>
            <Select options={[{ value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }]} />
          </Form.Item>
          <Form.Item label="Parameter" name="parameter"><Input placeholder="e.g. Purity %" /></Form.Item>
          <Form.Item label="Expected" name="expected"><Input placeholder="e.g. >= 99" /></Form.Item>
          <Form.Item label="Observed" name="observed"><Input placeholder="e.g. 99.4" /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
