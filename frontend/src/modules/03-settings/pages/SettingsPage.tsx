import { useEffect, useState } from 'react';
import { Button, Card, Collapse, Descriptions, Input, Select, Space, Switch, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { settingsApi } from '../api/settingsApi';
import type { Setting } from '../types/settings.types';

function SettingValueEditor({ setting, onSave }: { setting: Setting; onSave: (v: unknown) => Promise<void> }) {
  const [val, setVal] = useState<unknown>(setting.value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await onSave(val); message.success(`Saved: ${setting.key}`); }
    finally { setSaving(false); }
  };

  switch (setting.type) {
    case 'bool':
      return (
        <Space>
          <Switch checked={!!val} onChange={(v) => setVal(v)} />
          <Button size="small" type="primary" loading={saving} onClick={save}>Save</Button>
        </Space>
      );
    case 'int':
      return (
        <Space>
          <Input
            type="number"
            value={String(val ?? '')}
            onChange={(e) => setVal(e.target.value === '' ? null : Number(e.target.value))}
            style={{ width: 160 }}
          />
          <Button size="small" type="primary" loading={saving} onClick={save}>Save</Button>
        </Space>
      );
    case 'select':
      return (
        <Space>
          <Select
            value={val as string}
            onChange={(v) => setVal(v)}
            options={(setting.options ?? []).map((o) => ({ label: o.label, value: o.value }))}
            style={{ minWidth: 200 }}
          />
          <Button size="small" type="primary" loading={saving} onClick={save}>Save</Button>
        </Space>
      );
    case 'text':
      return (
        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea rows={3} value={String(val ?? '')} onChange={(e) => setVal(e.target.value)} />
          <Button type="primary" loading={saving} onClick={save}>Save</Button>
        </Space.Compact>
      );
    case 'json':
      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea rows={4} value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)} onChange={(e) => setVal(e.target.value)} />
          <Button size="small" type="primary" loading={saving} onClick={async () => {
            try {
              const parsed = JSON.parse(typeof val === 'string' ? val : JSON.stringify(val));
              await onSave(parsed);
              message.success(`Saved: ${setting.key}`);
            } catch { message.error('Invalid JSON.'); }
          }}>Save</Button>
        </Space>
      );
    default:
      return (
        <Space>
          <Input value={String(val ?? '')} onChange={(e) => setVal(e.target.value)} style={{ width: 280 }} />
          <Button size="small" type="primary" loading={saving} onClick={save}>Save</Button>
        </Space>
      );
  }
}

export default function SettingsPage() {
  const [list, setList] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await settingsApi.list({ search: search || undefined });
      setList(r);
    } catch { message.error('Failed to load settings.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, []);

  const onSave = async (s: Setting, value: unknown) => {
    const updated = await settingsApi.update(s.id, value);
    setList((prev) => prev.map((x) => x.id === s.id ? { ...x, value: updated.value } : x));
  };

  // Group by `group` field
  const groups = list.reduce<Record<string, Setting[]>>((acc, s) => {
    (acc[s.group] = acc[s.group] ?? []).push(s);
    return acc;
  }, {});

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Settings</Typography.Title>
          <Space>
            <Input.Search
              placeholder="Search key or label"
              allowClear
              onSearch={(v) => { setSearch(v); void fetchData(); }}
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
          </Space>
        </Space>

        <Collapse
          accordion={false}
          defaultActiveKey={Object.keys(groups)}
          items={Object.entries(groups).map(([group, rows]) => ({
            key: group,
            label: <Space><strong style={{ textTransform: 'capitalize' }}>{group}</strong><Tag>{rows.length}</Tag></Space>,
            children: (
              <Descriptions column={1} bordered size="small">
                {rows.map((s) => (
                  <Descriptions.Item
                    key={s.id}
                    label={
                      <Space direction="vertical" size={0}>
                        <span><strong>{s.label ?? s.key}</strong> {s.is_system && <Tag color="blue">system</Tag>}</span>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{s.key}</Typography.Text>
                      </Space>
                    }
                  >
                    <SettingValueEditor setting={s} onSave={(v) => onSave(s, v)} />
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ),
          }))}
        />
        {loading && <Typography.Text type="secondary">Loading…</Typography.Text>}
      </Space>
    </Card>
  );
}
