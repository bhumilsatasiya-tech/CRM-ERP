import { useEffect } from 'react';
import { Form, Input, Modal, message } from 'antd';
import { categoryApi } from '../05-products/api/productsApi';
import type { CreateCategoryPayload, ProductCategory } from '../05-products/types/products.types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreated: (cat: ProductCategory) => void;
}

export default function InlineCreateCategoryModal({ open, onCancel, onCreated }: Props) {
  const [form] = Form.useForm<CreateCategoryPayload>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const onOk = async () => {
    try {
      const v = await form.validateFields();
      const created = await categoryApi.create(v);
      message.success(`Category "${created.name}" created.`);
      onCreated(created);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown[]; response?: { data?: { message?: string } } };
      if (!err.errorFields) message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  return (
    <Modal open={open} title="Quick add category" onCancel={onCancel} onOk={onOk} okText="Create" destroyOnClose width={460}>
      <Form<CreateCategoryPayload> form={form} layout="vertical" initialValues={{ is_active: true, sort_order: 0 }}>
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item label="Description (optional)" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
