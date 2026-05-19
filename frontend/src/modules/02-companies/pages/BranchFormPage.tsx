import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Space, Switch, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { branchApi } from '../api/branchApi';
import type { CreateBranchPayload } from '../types/companies.types';

export default function BranchFormPage() {
  const { companyId, branchId } = useParams();
  const editing = Boolean(branchId);
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateBranchPayload>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing || !branchId) return;
    setLoading(true);
    branchApi.get(Number(branchId))
      .then((b) => {
        form.setFieldsValue({
          code: b.code, name: b.name, is_head_office: b.is_head_office,
          email: b.email ?? undefined, phone: b.phone ?? undefined,
          address_line1: b.address?.line1 ?? undefined,
          address_line2: b.address?.line2 ?? undefined,
          city: b.address?.city ?? undefined,
          state: b.address?.state ?? undefined,
          country: b.address?.country ?? 'India',
          postal_code: b.address?.postal_code ?? undefined,
          gst_no: b.gst_no ?? undefined,
          is_active: b.is_active,
        });
      })
      .catch(() => message.error('Failed to load branch.'))
      .finally(() => setLoading(false));
  }, [editing, branchId, form]);

  const onFinish = async (values: CreateBranchPayload) => {
    if (!companyId) return;
    setSaving(true);
    try {
      if (editing && branchId) {
        await branchApi.update(Number(branchId), values);
        message.success('Branch updated.');
      } else {
        await branchApi.create(Number(companyId), values);
        message.success('Branch created.');
      }
      navigate(`/companies/${companyId}/branches`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>{editing ? 'Edit branch' : 'New branch'}</Typography.Title>
      <Form<CreateBranchPayload>
        form={form}
        layout="vertical"
        initialValues={{ is_active: true, is_head_office: false, country: 'India' }}
        onFinish={onFinish}
      >
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item label="Code" name="code" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]+$/, message: 'Letters/numbers/dash only' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label="Head office" name="is_head_office" valuePropName="checked"><Switch /></Form.Item>
          </Col>

          <Col xs={24} md={12}><Form.Item label="Email" name="email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Phone" name="phone"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="GST" name="gst_no"><Input /></Form.Item></Col>

          <Col xs={24} md={12}><Form.Item label="Address line 1" name="address_line1"><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Address line 2" name="address_line2"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="City" name="city"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="State" name="state"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Country" name="country"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Postal code" name="postal_code"><Input /></Form.Item></Col>

          <Col xs={12} md={6}>
            <Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item>
          </Col>
        </Row>

        <Space>
          <Button onClick={() => navigate(`/companies/${companyId}/branches`)}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>{editing ? 'Save changes' : 'Create branch'}</Button>
        </Space>
      </Form>
    </Card>
  );
}
