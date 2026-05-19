import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { productApi, unitApi } from '../05-products/api/productsApi';
import type { CreateProductPayload, Product, ProductType, ProductUnit } from '../05-products/types/products.types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreated: (product: Product) => void;
  defaultType?: ProductType;
  lockType?: boolean;
}

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'raw',        label: 'Raw material' },
  { value: 'finished',   label: 'Finished good' },
  { value: 'packaging',  label: 'Packaging' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'service',    label: 'Service' },
  { value: 'other',      label: 'Other' },
];

export default function InlineCreateProductModal({ open, onCancel, onCreated, defaultType = 'finished', lockType = false }: Props) {
  const [form] = Form.useForm<CreateProductPayload>();
  const [units, setUnits] = useState<ProductUnit[]>([]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    unitApi.list().then(setUnits).catch(() => undefined);
  }, [open, form]);

  const onOk = async () => {
    try {
      const v = await form.validateFields();
      const created = await productApi.create(v);
      message.success(`Product "${created.name}" created.`);
      onCreated(created);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown[]; response?: { data?: { message?: string } } };
      if (!err.errorFields) message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  return (
    <Modal
      open={open}
      title="Quick add product"
      onCancel={onCancel}
      onOk={onOk}
      okText="Create"
      destroyOnClose
      width={560}
    >
      <Form<CreateProductPayload>
        form={form}
        layout="vertical"
        initialValues={{ type: defaultType, tax_rate: 18 }}
      >
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item label="Type" name="type" rules={[{ required: true }]}>
          <Select disabled={lockType} options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label="Unit" name="unit_id" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Pick a unit"
            options={units.map((u) => ({ value: u.id, label: `${u.symbol} — ${u.name}` }))}
          />
        </Form.Item>
        <Form.Item label="HSN/SAC (optional)" name="hsn_code">
          <Input maxLength={16} />
        </Form.Item>
        <Form.Item label="Tax %" name="tax_rate">
          <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Standard price" name="standard_price">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
