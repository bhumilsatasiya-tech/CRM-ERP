import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Checkbox, Col, Divider, Empty, Form, Input, InputNumber, Row, Space, Spin,
  Switch, Tag, Typography, message,
} from 'antd';
import {
  CheckCircleFilled, ExperimentOutlined, FundOutlined, GlobalOutlined,
  LockOutlined, SafetyCertificateOutlined, UnlockOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../app/hooks';
import { confirmDelete } from '../../common/confirmDelete';
import {
  securityApi, MODULE_LABEL,
  type ModuleKey, type ModuleLock, type PinStatus,
} from '../api/securityApi';

const MODULE_ICONS: Record<ModuleKey, React.ReactNode> = {
  project_costing: <FundOutlined />,
  production:      <ExperimentOutlined />,
  export_bank:     <GlobalOutlined />,
};

const MODULE_COLORS: Record<ModuleKey, string> = {
  project_costing: '#9254de',
  production:      <></> as never,
  export_bank:     '#13c2c2',
};

// fix React-as-color typo above
const MODULE_COLORS_FIXED: Record<ModuleKey, string> = {
  project_costing: '#9254de',
  production:      '#722ed1',
  export_bank:     '#13c2c2',
};

/**
 * Security & Module Locks — Tally-style master switch + per-module PIN lock.
 *
 *   - Master toggle at the top.
 *   - When OFF → entire page collapses to a single message; no PIN section
 *     shown, no module list, system runs normally everywhere.
 *   - When ON  → admin sees the module multi-select + PIN section; users see
 *     just the PIN section.
 */
export default function SecuritySettingsPage() {
  const me = useAppSelector((s) => s.auth.user);
  // super-admin uses Gate::before bypass on the backend, so the permission isn't
  // necessarily in the user.permissions array. Check role too.
  const isAdmin =
    (me?.roles?.includes('super-admin') ?? false)
    || (me?.roles?.includes('admin') ?? false)
    || (me?.permissions?.includes('security.lock.manage') ?? false);

  const [masterOn, setMasterOn] = useState<boolean | null>(null);
  const [locks, setLocks] = useState<ModuleLock[]>([]);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingMaster, setSavingMaster] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const master = await securityApi.master();
      setMasterOn(master.is_enabled);
      // Only fetch locks list if admin AND master is on
      if (master.is_enabled && isAdmin) {
        setLocks(await securityApi.locks());
      } else {
        setLocks([]);
      }
      setPinStatus(await securityApi.pinStatus());
    } catch { message.error('Failed to load security settings.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchAll(); /* eslint-disable-next-line */ }, []);

  const onToggleMaster = async (enabled: boolean) => {
    setSavingMaster(true);
    try {
      await securityApi.setMaster(enabled);
      setMasterOn(enabled);
      message.success(enabled ? 'PIN security turned ON.' : 'PIN security turned OFF. All modules now open.');
      // Re-fetch locks if we just turned ON
      if (enabled && isAdmin) setLocks(await securityApi.locks());
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    } finally { setSavingMaster(false); }
  };

  const onToggleModule = async (lock: ModuleLock, enabled: boolean) => {
    try {
      const updated = await securityApi.setLock(lock.module_key, { is_enabled: enabled, unlock_minutes: lock.unlock_minutes });
      setLocks((rows) => rows.map((r) => r.module_key === updated.module_key ? updated : r));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    }
  };

  const onUnlockMinutes = async (lock: ModuleLock, minutes: number) => {
    try {
      const updated = await securityApi.setLock(lock.module_key, { is_enabled: lock.is_enabled, unlock_minutes: minutes });
      setLocks((rows) => rows.map((r) => r.module_key === updated.module_key ? updated : r));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* === HEADER === */}
        <Space size="middle">
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          <Space direction="vertical" size={0}>
            <Typography.Title level={4} style={{ margin: 0 }}>Security &amp; Module Locks</Typography.Title>
            <Typography.Text type="secondary">
              Master switch below. When ON, modules in the list require PIN entry. When OFF, everything runs normally.
            </Typography.Text>
          </Space>
        </Space>

        {/* === MASTER ON/OFF === */}
        <Card
          loading={loading && masterOn === null}
          bodyStyle={{ padding: 18 }}
          style={{
            borderLeft: `5px solid ${masterOn ? '#52c41a' : '#bfbfbf'}`,
            background: masterOn
              ? 'linear-gradient(135deg, #f6ffed 0%, #ffffff 70%)'
              : 'linear-gradient(135deg, #fafafa 0%, #ffffff 70%)',
          }}
        >
          <Space size="large" align="center" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Space size="middle" align="center">
              <div style={{
                fontSize: 32, color: masterOn ? '#52c41a' : '#bfbfbf',
                lineHeight: 1,
              }}>
                {masterOn ? <LockOutlined /> : <UnlockOutlined />}
              </div>
              <Space direction="vertical" size={2}>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  PIN Security {masterOn ? <Tag color="green" style={{ marginLeft: 8 }}>ON</Tag> : <Tag color="default" style={{ marginLeft: 8 }}>OFF</Tag>}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {masterOn
                    ? 'PIN entry required for the modules selected below.'
                    : 'All modules are open. RBAC permissions still apply as normal.'}
                </Typography.Text>
              </Space>
            </Space>
            <Switch
              checked={masterOn ?? false}
              loading={savingMaster}
              disabled={!isAdmin}
              onChange={(v) => void onToggleMaster(v)}
              checkedChildren="ON"
              unCheckedChildren="OFF"
              style={{ minWidth: 64 }}
            />
          </Space>
          {!isAdmin && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12 }}
              message="Only admins can toggle the master switch. Ask an admin to grant 'security.lock.manage' if you need access."
            />
          )}
        </Card>

        {/* === EVERYTHING ELSE — only when master is ON === */}
        {masterOn === false ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={4}>
                <Typography.Text type="secondary">Security is disabled.</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Turn the master switch ON above to configure module locks and set your PIN.
                </Typography.Text>
              </Space>
            }
          />
        ) : masterOn === true ? (
          <>
            {/* === SECTION: Module multi-select (admin only) === */}
            {isAdmin && (
              <Card
                title={<Space><LockOutlined /> Apply PIN to which modules? <Tag color="orange">Admin only</Tag></Space>}
                bodyStyle={{ padding: 14 }}
                style={{ borderLeft: '4px solid #fa8c16' }}
              >
                {loading ? (
                  <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
                ) : (
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {locks.map((lock) => (
                      <Row key={lock.module_key} gutter={12} align="middle"
                        style={{
                          padding: '10px 12px',
                          borderRadius: 6,
                          background: lock.is_enabled ? '#fff7e6' : '#fafafa',
                          border: `1px solid ${lock.is_enabled ? '#ffd591' : '#f0f0f0'}`,
                        }}
                      >
                        <Col flex="none">
                          <Checkbox
                            checked={lock.is_enabled}
                            onChange={(e) => void onToggleModule(lock, e.target.checked)}
                          />
                        </Col>
                        <Col flex="none">
                          <span style={{ fontSize: 18, color: MODULE_COLORS_FIXED[lock.module_key] }}>
                            {MODULE_ICONS[lock.module_key]}
                          </span>
                        </Col>
                        <Col flex="auto">
                          <Typography.Text strong>{MODULE_LABEL[lock.module_key]}</Typography.Text>
                          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                            {lock.is_enabled ? '🔒 PIN required to enter' : '🔓 Open (no PIN)'}
                          </Typography.Text>
                        </Col>
                        {lock.is_enabled && (
                          <Col flex="none">
                            <Space size="small">
                              <Typography.Text type="secondary" style={{ fontSize: 11 }}>Unlock for:</Typography.Text>
                              <InputNumber
                                size="small"
                                min={5} max={240} step={5}
                                value={lock.unlock_minutes}
                                onChange={(v) => v && void onUnlockMinutes(lock, Number(v))}
                                style={{ width: 70 }}
                                addonAfter="min"
                              />
                            </Space>
                          </Col>
                        )}
                      </Row>
                    ))}
                  </Space>
                )}
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 14 }}
                  message="Tick a module to require PIN entry on every visit. Unticked modules open normally (only RBAC applies)."
                />
              </Card>
            )}

            {/* === SECTION: My PIN === */}
            <Card
              title={<Space><SafetyCertificateOutlined /> My PIN</Space>}
              loading={loading}
              bodyStyle={{ padding: 14 }}
              style={{ borderLeft: '4px solid #1677ff' }}
            >
              {pinStatus && (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    {pinStatus.has_pin
                      ? <Tag icon={<CheckCircleFilled />} color="green">PIN is set</Tag>
                      : <Tag color="orange">No PIN set</Tag>}
                    {pinStatus.is_locked_out && <Tag color="red">Locked out until {pinStatus.locked_until}</Tag>}
                    {pinStatus.last_unlock_at && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Last unlock: {new Date(pinStatus.last_unlock_at).toLocaleString()}
                      </Typography.Text>
                    )}
                  </Space>
                  <SetPinForm hasPin={pinStatus.has_pin} onSaved={() => void fetchAll()} />
                  {pinStatus.has_pin && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />
                      <RemovePinForm onRemoved={() => void fetchAll()} />
                    </>
                  )}
                </>
              )}
            </Card>

            {/* === HELP === */}
            <Alert
              showIcon
              type="info"
              message="How it works"
              description={
                <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>Master OFF</strong> → no PIN anywhere; all modules open with normal RBAC.</li>
                  <li><strong>Master ON</strong> → only modules ticked above require PIN.</li>
                  <li><strong>User sets a PIN</strong> (4-8 digits) below → kept hashed.</li>
                  <li>Visit a locked module → big PIN prompt appears → correct PIN unlocks for N minutes.</li>
                  <li>3 wrong PINs → 10-minute lockout. Resets on next correct PIN.</li>
                </ul>
              }
            />
          </>
        ) : null}

      </Space>
    </Card>
  );
}

/* ============================================================ Sub-forms */

function SetPinForm({ hasPin, onSaved }: { hasPin: boolean; onSaved: () => void }) {
  const [form] = Form.useForm<{ current_pin?: string; pin: string; pin_confirm: string }>();
  const [saving, setSaving] = useState(false);

  const onFinish = async (v: { current_pin?: string; pin: string; pin_confirm: string }) => {
    if (v.pin !== v.pin_confirm) {
      message.error('PIN and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await securityApi.setPin(v.pin, v.current_pin);
      message.success(hasPin ? 'PIN changed.' : 'PIN set.');
      form.resetFields();
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Row gutter={12}>
        {hasPin && (
          <Col xs={24} md={8}>
            <Form.Item label="Current PIN" name="current_pin" rules={[{ required: true, message: 'Enter your current PIN' }]}>
              <Input.Password placeholder="•••••" maxLength={8} autoComplete="off" />
            </Form.Item>
          </Col>
        )}
        <Col xs={24} md={8}>
          <Form.Item label={hasPin ? 'New PIN' : 'New PIN (4-8 digits)'} name="pin"
            rules={[{ required: true, pattern: /^\d{4,8}$/, message: '4-8 digits only' }]}>
            <Input.Password placeholder="•••••" maxLength={8} autoComplete="new-password" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Confirm new PIN" name="pin_confirm" rules={[{ required: true }]}>
            <Input.Password placeholder="•••••" maxLength={8} autoComplete="new-password" />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" loading={saving} icon={<UnlockOutlined />}>
        {hasPin ? 'Change PIN' : 'Set PIN'}
      </Button>
    </Form>
  );
}

function RemovePinForm({ onRemoved }: { onRemoved: () => void }) {
  const [form] = Form.useForm<{ current_pin: string }>();
  const [saving, setSaving] = useState(false);

  const onRemove = async () => {
    try {
      const v = await form.validateFields();
      confirmDelete({
        title: 'Remove your PIN?',
        content: 'Without a PIN you will NOT be able to access locked modules. An admin will need to disable the lock or you will need to set a new PIN.',
        okText: 'Yes, remove PIN',
        onOk: async () => {
          setSaving(true);
          try {
            await securityApi.removePin(v.current_pin);
            message.success('PIN removed.');
            form.resetFields();
            onRemoved();
          } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            message.error(err.response?.data?.message ?? 'Failed.');
          } finally { setSaving(false); }
        },
      });
    } catch { /* validation failed */ }
  };

  return (
    <Form layout="vertical" form={form}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        Remove my PIN (requires current PIN to confirm).
      </Typography.Text>
      <Row gutter={12}>
        <Col xs={24} md={8}>
          <Form.Item label="Current PIN" name="current_pin" rules={[{ required: true }]}>
            <Input.Password placeholder="•••••" maxLength={8} autoComplete="off" />
          </Form.Item>
        </Col>
        <Col xs={24} md={4}>
          <Form.Item label=" ">
            <Button danger loading={saving} onClick={onRemove}>Remove PIN</Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}

// Silence unused var warning — MODULE_COLORS had a typo and we use MODULE_COLORS_FIXED.
void MODULE_COLORS;
