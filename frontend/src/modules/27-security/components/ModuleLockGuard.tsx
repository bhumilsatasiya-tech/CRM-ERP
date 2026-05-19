import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Result, Space, Spin, Tag, Typography, message } from 'antd';
import { LockOutlined, SafetyCertificateOutlined, UnlockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { MODULE_LABEL, securityApi, type ModuleKey } from '../api/securityApi';

interface Props {
  moduleKey: ModuleKey;
  children: React.ReactNode;
}

/**
 * Wraps a route element. On mount, checks whether the module is locked AND the
 * user has an active unlock session. If lock + no session → renders a PIN entry
 * screen. Correct PIN → unlock + render the wrapped children.
 *
 * Usage in routes.tsx:
 *   { path: '/projects', element: <RequireAuth><ModuleLockGuard moduleKey="project_costing"><ProjectsList /></ModuleLockGuard></RequireAuth> }
 */
export default function ModuleLockGuard({ moduleKey, children }: Props) {
  const [state, setState] = useState<'checking' | 'unlocked' | 'needs_pin' | 'no_pin'>('checking');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const check = async () => {
    setState('checking');
    try {
      const status = await securityApi.unlockStatus(moduleKey);
      if (! status.is_locked || status.is_unlocked) {
        setState('unlocked');
      } else {
        // Module locked + no active session → need PIN. Check if user even has one.
        const pinStatus = await securityApi.pinStatus();
        setState(pinStatus.has_pin ? 'needs_pin' : 'no_pin');
      }
    } catch {
      // If unlock-status fails (e.g. 403), fail safe: assume needs PIN.
      setState('needs_pin');
    }
  };

  useEffect(() => { void check(); /* eslint-disable-next-line */ }, [moduleKey]);

  const onSubmit = async () => {
    if (pin.length < 4) return;
    setSubmitting(true);
    try {
      const r = await securityApi.unlock(moduleKey, pin);
      if (r.is_unlocked) {
        message.success(`Unlocked — valid for ${r.unlocked_until ? Math.round((new Date(r.unlocked_until).getTime() - Date.now()) / 60000) : '?'} minutes.`);
        setPin('');
        setState('unlocked');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Wrong PIN.');
      setPin('');
    } finally { setSubmitting(false); }
  };

  if (state === 'checking') {
    return <div style={{ padding: 60, textAlign: 'center' }}><Spin size="large" tip="Checking module lock..." /></div>;
  }

  if (state === 'unlocked') {
    return <>{children}</>;
  }

  if (state === 'no_pin') {
    return (
      <Result
        status="warning"
        icon={<SafetyCertificateOutlined style={{ color: '#fa8c16' }} />}
        title={`${MODULE_LABEL[moduleKey]} is locked`}
        subTitle="This module requires a PIN to access. You haven't set one yet."
        extra={[
          <Link key="settings" to="/settings/security"><Button type="primary" icon={<SafetyCertificateOutlined />}>Set my PIN</Button></Link>,
          <Button key="back" onClick={() => navigate(-1)}>Back</Button>,
        ]}
      />
    );
  }

  // needs_pin
  return (
    <Card
      style={{ maxWidth: 480, margin: '40px auto', borderTop: '4px solid #fa8c16' }}
      bodyStyle={{ padding: 24 }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
        <LockOutlined style={{ fontSize: 48, color: '#fa8c16' }} />
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>{MODULE_LABEL[moduleKey]}</Typography.Title>
          <Tag color="orange" style={{ marginTop: 8 }}>This module is PIN-locked</Tag>
        </div>
        <Typography.Text type="secondary">
          Enter your 4-8 digit PIN to unlock. Wrong attempts are tracked; after 3 failures you&apos;ll be locked out for 10 minutes.
        </Typography.Text>

        <Input.Password
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
          placeholder="••••"
          maxLength={8}
          size="large"
          autoFocus
          autoComplete="off"
          onPressEnter={onSubmit}
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: 12 }}
        />

        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="primary" icon={<UnlockOutlined />} loading={submitting} disabled={pin.length < 4} onClick={onSubmit}>
            Unlock
          </Button>
        </Space>

        <Alert
          type="info"
          showIcon
          message={<><Link to="/settings/security">Manage PIN in Settings</Link></>}
          style={{ textAlign: 'left' }}
        />
      </Space>
    </Card>
  );
}
