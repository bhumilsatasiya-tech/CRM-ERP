import { useMemo } from 'react';
import { Card, Checkbox, Col, Empty, Row, Space, Typography } from 'antd';
import type { Permission } from '../types/auth.types';

interface Props {
  permissions: Permission[];
  value?: string[];
  onChange?: (next: string[]) => void;
}

export default function PermissionMatrix({ permissions, value = [], onChange }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const key = p.module ?? p.name.split('.')[0] ?? 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const selected = new Set(value);

  const toggle = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    onChange?.(Array.from(next));
  };

  const toggleGroup = (group: Permission[], all: boolean) => {
    const next = new Set(selected);
    for (const p of group) {
      if (all) next.add(p.name); else next.delete(p.name);
    }
    onChange?.(Array.from(next));
  };

  if (permissions.length === 0) {
    return <Empty description="No permissions defined" />;
  }

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {grouped.map(([module, perms]) => {
        const allChecked = perms.every((p) => selected.has(p.name));
        const someChecked = perms.some((p) => selected.has(p.name));
        return (
          <Card
            key={module}
            size="small"
            title={
              <Space>
                <Checkbox
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={(e) => toggleGroup(perms, e.target.checked)}
                />
                <Typography.Text strong style={{ textTransform: 'capitalize' }}>{module}</Typography.Text>
                <Typography.Text type="secondary">
                  ({perms.filter((p) => selected.has(p.name)).length}/{perms.length})
                </Typography.Text>
              </Space>
            }
          >
            <Row gutter={[8, 8]}>
              {perms.map((p) => (
                <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
                  <Checkbox checked={selected.has(p.name)} onChange={() => toggle(p.name)}>
                    {p.name}
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </Card>
        );
      })}
    </Space>
  );
}
