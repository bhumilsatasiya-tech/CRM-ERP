import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { roleApi } from '../api/roleApi';
import type { Permission } from '../types/auth.types';
import PermissionMatrix from '../components/PermissionMatrix';

interface FormShape {
  name: string;
  description?: string;
  permissions: string[];
}

export default function RoleFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormShape>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [isSystem, setIsSystem] = useState(false);

  useEffect(() => {
    roleApi.permissions().then(setAllPermissions).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    roleApi
      .get(Number(id))
      .then((r) => {
        setIsSystem(r.is_system);
        form.setFieldsValue({
          name: r.name,
          description: r.description ?? undefined,
          permissions: r.permissions ?? [],
        });
      })
      .catch(() => message.error('Failed to load role.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  const onFinish = async (values: FormShape) => {
    setSaving(true);
    try {
      if (editing && id) {
        await roleApi.update(Number(id), values);
        message.success('Role updated.');
      } else {
        await roleApi.create(values);
        message.success('Role created.');
      }
      navigate('/roles');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {editing ? `Edit role` : 'New role'}
        </Typography.Title>

        <Form<FormShape>
          form={form}
          layout="vertical"
          initialValues={{ permissions: [] }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true },
              { pattern: /^[a-z0-9-]+$/, message: 'Lowercase letters, numbers, dashes only' },
            ]}
          >
            <Input disabled={isSystem} placeholder="e.g. sales-manager" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} maxLength={255} />
          </Form.Item>

          <Form.Item label="Permissions" name="permissions" valuePropName="value" trigger="onChange">
            <PermissionMatrix permissions={allPermissions} />
          </Form.Item>

          <Space>
            <Button onClick={() => navigate('/roles')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create role'}
            </Button>
          </Space>
        </Form>
      </Space>
    </Card>
  );
}
