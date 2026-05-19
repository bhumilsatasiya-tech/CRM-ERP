import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Space, Switch, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { userApi } from '../api/userApi';
import { roleApi } from '../api/roleApi';
import type { Role, User } from '../types/auth.types';

interface FormShape {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  password_confirmation?: string;
  is_active: boolean;
  default_company_id?: number | null;
  locale?: string;
  timezone?: string;
  roles?: string[];
  must_change_password?: boolean;
}

export default function UserFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormShape>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    roleApi.list({ per_page: 100 }).then((r) => setRoles(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    userApi
      .get(Number(id))
      .then((u: User) => {
        form.setFieldsValue({
          name: u.name,
          email: u.email,
          phone: u.phone ?? undefined,
          is_active: u.is_active,
          default_company_id: u.default_company_id ?? null,
          locale: u.locale,
          timezone: u.timezone,
          roles: u.roles ?? [],
          must_change_password: u.must_change_password,
        });
      })
      .catch(() => message.error('Failed to load user.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  const onFinish = async (values: FormShape) => {
    setSaving(true);
    try {
      if (editing && id) {
        await userApi.update(Number(id), values);
        message.success('User updated.');
      } else {
        if (!values.password) {
          message.error('Password is required.');
          return;
        }
        await userApi.create({
          ...values,
          password: values.password,
          password_confirmation: values.password_confirmation ?? '',
        });
        message.success('User created.');
      }
      navigate('/users');
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
          {editing ? 'Edit user' : 'New user'}
        </Typography.Title>

        <Form<FormShape>
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
            locale: 'en',
            timezone: 'Asia/Kolkata',
            must_change_password: true,
            roles: [],
          }}
          onFinish={onFinish}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Name" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Phone" name="phone">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Locale" name="locale">
                <Select options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Timezone" name="timezone">
                <Input />
              </Form.Item>
            </Col>

            {!editing && (
              <>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Password"
                    name="password"
                    rules={[{ required: true, min: 10 }]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Confirm password"
                    name="password_confirmation"
                    dependencies={['password']}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, v) {
                          if (!v || getFieldValue('password') === v) return Promise.resolve();
                          return Promise.reject(new Error('Passwords do not match'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
              </>
            )}

            <Col xs={24}>
              <Form.Item label="Roles" name="roles">
                <Select
                  mode="multiple"
                  placeholder="Assign roles"
                  options={roles.map((r) => ({ label: r.name, value: r.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Active" name="is_active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Force password change" name="must_change_password" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button onClick={() => navigate('/users')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create user'}
            </Button>
          </Space>
        </Form>
      </Space>
    </Card>
  );
}
