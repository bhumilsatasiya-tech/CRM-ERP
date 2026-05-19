import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async ({ email }: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f0f2f5', padding: 16,
    }}>
      <Card style={{ width: 420, maxWidth: '100%' }}>
        <Typography.Title level={4}>Reset password</Typography.Title>
        <Typography.Paragraph type="secondary">
          Enter your email and we&apos;ll send a password-reset link.
        </Typography.Paragraph>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        {sent && (
          <Alert
            type="success"
            message="If the email exists, a reset link has been sent."
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input placeholder="you@company.com" autoFocus />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} disabled={sent}>
              Send reset link
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Typography.Link onClick={() => navigate('/login')}>Back to sign in</Typography.Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
