import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { unitApi } from '../05-products/api/productsApi';
import type { CreateUnitPayload, ProductUnit, UnitType } from '../05-products/types/products.types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreated: (unit: ProductUnit) => void;
}

const TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'count',  label: 'Count' },
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'length', label: 'Length' },
  { value: 'area',   label: 'Area' },
  { value: 'time',   label: 'Time' },
  { value: 'other',  label: 'Other' },
];

export default function InlineCreateUnitModal({ open, onCancel, onCreated }: Props) {
  const [form] = Form.useForm<CreateUnitPayload>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const onOk = async () => {
    try {
      const v = await form.validateFields();
      const created = await unitApi.create({ ...v, conversion_factor: v.conversion_factor ?? 1, is_base: v.is_base ?? false, is_active: true });
      message.success(`Unit "${created.symbol}" created.`);
      onCreated(created);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown[]; response?: { data?: { message?: string } } };
      if (!err.errorFields) message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  return (
    <Modal open={open} title="Quick add unit" onCancel={onCancel} onOk={onOk} okText="Create" destroyOnClose width={520}>
      <Form<CreateUnitPayload> form={form} layout="vertical" initialValues={{ type: 'count', decimals_allowed: 2 }}>
        <Form.Item label="Symbol" name="symbol" rules={[{ required: true, max: 16 }]} extra="e.g. kg, L, pcs">
          <Input autoFocus />
        </Form.Item>
        <Form.Item label="Name" name="name" rules={[{ required: true, max: 64 }]}>
          <Input placeholder="kilogram" />
        </Form.Item>
        <Form.Item label="Formal name (optional)" name="formal_name" extra="Long form for printed docs">
          <Input maxLength={128} />
        </Form.Item>
        <Form.Item label="UQC (optional)" name="uqc" extra="Indian GST/customs Unit Quantity Code">
          <Input maxLength={8} />
        </Form.Item>
        <Form.Item label="Type" name="type" rules={[{ required: true }]}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label="Decimal places" name="decimals_allowed">
          <InputNumber min={0} max={8} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
