import { useEffect, useState } from 'react';
import { Modal, Space, Tag, Typography } from 'antd';
import { ALL_SHORTCUTS, matchCombo, type Shortcut } from './shortcuts';

/**
 * Modal listing every keyboard shortcut. Opens on `?`.
 * Mounted once at App level next to GlobalKeyboard.
 */
export default function ShortcutsCheatSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip when user is typing
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      if (matchCombo('?', e)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const groups = ALL_SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    const g = s.group ?? 'Other';
    (acc[g] ||= []).push(s);
    return acc;
  }, {});
  const order: string[] = ['Universal', 'Navigate', 'Voucher'];

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      width={620}
      title={<Space><Typography.Text strong>Keyboard shortcuts</Typography.Text><Tag>?</Tag></Space>}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {order.filter((g) => groups[g]).map((g) => (
          <div key={g}>
            <Typography.Text strong style={{ fontSize: 12, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.6 }}>{g}</Typography.Text>
            <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', alignItems: 'baseline' }}>
              {groups[g].map((s) => (
                <div key={s.id} style={{ display: 'contents' }}>
                  <Tag style={{
                    fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
                    fontSize: 11,
                    margin: 0,
                  }}>{s.combo}</Tag>
                  <Typography.Text style={{ fontSize: 13 }}>{s.label}</Typography.Text>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          Press ? again to close. Shortcuts are disabled while typing in inputs.
        </Typography.Text>
      </Space>
    </Modal>
  );
}
