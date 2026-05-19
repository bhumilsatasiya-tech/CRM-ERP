import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/authApi';

interface ResetFormValues {
  email: string;
  password: string;
  password_confirmation: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = params.get('token') ?? '';
  const initialEmail = params.get('email') ?? '';

  const onFinish = async (values: ResetFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword({
        token,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      navigate('/login', { state: { reset: true }, replace: true });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f0f2f5', padding: 16,
    }}>
      <Card style={{ width: 460, maxWidth: '100%' }}>
        <Typography.Title level={4}>Set a new password</Typography.Title>

        {!token && (
          <Alert type="warning" message="Missing reset token. Use the link from your email." style={{ marginBottom: 16 }} />
        )}
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

        <Form<ResetFormValues>
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ email: initialEmail }}
        >
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <Form.Item
            label="New password"
            name="password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 10, message: 'At least 10 characters' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Confirm password"
            name="password_confirmation"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} disabled={!token}>
              Reset password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
