import { useEffect } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { clearAuthError, loginThunk } from '../store/authSlice';

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, user } = useAppSelector((s) => s.auth);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(from, { replace: true });
    }
  }, [status, user, from, navigate]);

  const onFinish = async (values: LoginFormValues) => {
    await dispatch(
      loginThunk({
        email: values.email,
        password: values.password,
        device_name: navigator.userAgent.substring(0, 64),
        remember: values.remember,
      }),
    );
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f0f2f5', padding: 16,
    }}>
      <Card style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>CRM + ERP</Typography.Title>
          <Typography.Text type="secondary">Sign in to your workspace</Typography.Text>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16 }}
            closable
            onClose={() => dispatch(clearAuthError())}
          />
        )}

        <Form<LoginFormValues>
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="on"
          initialValues={{ remember: true }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="you@company.com" autoFocus />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 12 }}>
            <Checkbox>Remember me on this device</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={status === 'loading'}>
              Sign in
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Typography.Link onClick={() => navigate('/forgot-password')}>
              Forgot password?
            </Typography.Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
