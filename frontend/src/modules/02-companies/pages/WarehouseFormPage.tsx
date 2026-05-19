import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Space, Switch, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { warehouseApi } from '../api/warehouseApi';
import { branchApi } from '../api/branchApi';
import type { Branch, CreateWarehousePayload, WarehouseType } from '../types/companies.types';

export default function WarehouseFormPage() {
  const { companyId, warehouseId } = useParams();
  const editing = Boolean(warehouseId);
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateWarehousePayload>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (!companyId) return;
    branchApi.list(Number(companyId), { per_page: 200 }).then((r) => setBranches(r.data)).catch(() => undefined);
  }, [companyId]);

  useEffect(() => {
    if (!editing || !warehouseId) return;
    setLoading(true);
    warehouseApi.get(Number(warehouseId))
      .then((w) => {
        form.setFieldsValue({
          code: w.code, name: w.name, type: w.type,
          branch_id: w.branch_id ?? null,
          address_line1: w.address?.line1 ?? undefined,
          city: w.address?.city ?? undefined,
          state: w.address?.state ?? undefined,
          country: w.address?.country ?? 'India',
          postal_code: w.address?.postal_code ?? undefined,
          is_active: w.is_active, is_default: w.is_default,
        });
      })
      .catch(() => message.error('Failed to load warehouse.'))
      .finally(() => setLoading(false));
  }, [editing, warehouseId, form]);

  const onFinish = async (values: CreateWarehousePayload) => {
    if (!companyId) return;
    setSaving(true);
    try {
      const payload = { ...values, type: values.type as WarehouseType };
      if (editing && warehouseId) {
        await warehouseApi.update(Number(warehouseId), payload);
        message.success('Warehouse updated.');
      } else {
        await warehouseApi.create(Number(companyId), payload);
        message.success('Warehouse created.');
      }
      navigate(`/companies/${companyId}/warehouses`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>{editing ? 'Edit warehouse' : 'New warehouse'}</Typography.Title>
      <Form<CreateWarehousePayload>
        form={form}
        layout="vertical"
        initialValues={{ is_active: true, is_default: false, country: 'India', type: 'finished' }}
        onFinish={onFinish}
      >
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item label="Code" name="code" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]+$/ }]}><Input /></Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Type" name="type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'finished', label: 'Finished goods' },
                  { value: 'raw', label: 'Raw material' },
                  { value: 'packaging', label: 'Packaging' },
                  { value: 'quarantine', label: 'Quarantine' },
                  { value: 'transit', label: 'Transit' },
                  { value: 'reject', label: 'Reject' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Branch (optional)" name="branch_id">
              <Select
                allowClear
                options={branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}><Form.Item label="Address line 1" name="address_line1"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="City" name="city"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="State" name="state"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Country" name="country"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Postal code" name="postal_code"><Input /></Form.Item></Col>

          <Col xs={12} md={6}><Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item label="Default" name="is_default" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>

        <Space>
          <Button onClick={() => navigate(`/companies/${companyId}/warehouses`)}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>{editing ? 'Save changes' : 'Create warehouse'}</Button>
        </Space>
      </Form>
    </Card>
  );
}
