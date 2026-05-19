import { useEffect } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';
import { partnerApi } from '../04-crm/api/partnerApi';
import type { CreatePartnerPayload, Partner, PartnerType } from '../04-crm/types/crm.types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreated: (partner: Partner) => void;
  /** Pre-select the type (e.g., 'client' on Quotation form). User can change. */
  defaultType?: PartnerType;
  /** Hide the type field (caller has fixed it). */
  lockType?: boolean;
}

const TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'client',       label: 'Client (Buyer)' },
  { value: 'supplier',     label: 'Supplier' },
  { value: 'logistic',     label: 'Logistic Company' },
  { value: 'vendor',       label: 'Vendor' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'importer',     label: 'Importer' },
  { value: 'employee',     label: 'Employee' },
  { value: 'other',        label: 'Other' },
];

export default function InlineCreatePartnerModal({ open, onCancel, onCreated, defaultType = 'client', lockType = false }: Props) {
  const [form] = Form.useForm<CreatePartnerPayload>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const onOk = async () => {
    try {
      const v = await form.validateFields();
      const created = await partnerApi.create({ ...v, country: (v.country ?? 'IN').toUpperCase() });
      message.success(`Partner "${created.name}" created.`);
      onCreated(created);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown[]; response?: { data?: { message?: string } } };
      if (!err.errorFields) message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  return (
    <Modal
      open={open}
      title="Quick add partner"
      onCancel={onCancel}
      onOk={onOk}
      okText="Create"
      destroyOnClose
      width={520}
    >
      <Form<CreatePartnerPayload>
        form={form}
        layout="vertical"
        initialValues={{ type: defaultType, country: 'IN' }}
      >
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input autoFocus placeholder="Acme Pharma" />
        </Form.Item>
        <Form.Item label="Type" name="type" rules={[{ required: true }]}>
          <Select disabled={lockType} options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label="Country (ISO-2)" name="country" rules={[{ required: true, len: 2 }]} extra="Use IN for India. Other = export, tax_treatment auto-locks to overseas.">
          <Input maxLength={2} style={{ textTransform: 'uppercase' }} />
        </Form.Item>
        <Form.Item label="GST (optional, India only)" name="gst_no">
          <Input maxLength={32} />
        </Form.Item>
        <Form.Item label="Email (optional)" name="email" rules={[{ type: 'email' }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
