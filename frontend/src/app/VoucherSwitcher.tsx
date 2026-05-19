import { useEffect, useState } from 'react';
import { Tooltip, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useActiveVoucherMatch, useVoucherPath } from './useVoucherPath';
import { VOUCHER_CATALOG, type VoucherEntry } from './voucherCatalog';

const FULL_WIDTH = 168;
const RAIL_WIDTH = 44;
const TOP_OFFSET = 80;     // below the topbar
const STORAGE_KEY = 'crm_erp.voucher_switcher.collapsed';

/**
 * Tally-style right-edge rail listing every voucher type so you can jump from
 * (say) Purchase Order to Sales Order in one click without going through the
 * sidebar / gateway. Only renders while the user is inside a voucher list/form
 * page (see `useVoucherPath`).
 *
 * Two modes:
 *  - Full (168 px wide)  — icon + label per voucher.
 *  - Collapsed (44 px)   — icon only; hover shows label tooltip.
 *
 * Preference persisted in localStorage so it stays where the user left it.
 */
export default function VoucherSwitcher() {
  const visible = useVoucherPath();
  const active = useActiveVoucherMatch();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    // Broadcast width so the QuickVoucherFab can shift away.
    window.dispatchEvent(new CustomEvent('crm-erp:voucher-switcher-width', {
      detail: visible ? (collapsed ? RAIL_WIDTH : FULL_WIDTH) : 0,
    }));
  }, [collapsed, visible]);

  if (!visible) return null;

  const width = collapsed ? RAIL_WIDTH : FULL_WIDTH;

  return (
    <aside
      style={{
        position: 'fixed',
        right: 0,
        top: TOP_OFFSET,
        bottom: 0,
        width,
        background: '#fff',
        borderLeft: '1px solid #e8e8e8',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.04)',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 90,
        transition: 'width 0.18s ease',
      }}
    >
      {/* Header / collapse toggle */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid #f0f0f0',
          cursor: 'pointer',
          background: '#fafafa',
          fontSize: 11,
          fontWeight: 600,
          color: '#595959',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
        title={collapsed ? 'Expand voucher rail' : 'Collapse voucher rail'}
      >
        {!collapsed && <span>Vouchers</span>}
        {collapsed ? <RightOutlined style={{ fontSize: 10 }} /> : <LeftOutlined style={{ fontSize: 10 }} />}
      </div>

      {VOUCHER_CATALOG.map((group) => (
        <div key={group.title} style={{ padding: '8px 0' }}>
          {!collapsed && (
            <Typography.Text
              style={{
                display: 'block',
                padding: '4px 12px 6px',
                fontSize: 10,
                fontWeight: 600,
                color: '#bfbfbf',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {group.title}
            </Typography.Text>
          )}
          {!collapsed === false && (
            <div style={{ height: 1, background: '#f0f0f0', margin: '4px 8px' }} />
          )}
          {group.items.map((item) => (
            <RailItem
              key={item.label}
              item={item}
              active={item.activeMatch === active}
              collapsed={collapsed}
              onClick={() => navigate(item.newRoute)}
            />
          ))}
        </div>
      ))}

      {!collapsed && (
        <div style={{ padding: 12, fontSize: 10, color: '#bfbfbf', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          Click any voucher to start a new entry. Switching here doesn&apos;t lose your current work — it just navigates.
        </div>
      )}
    </aside>
  );
}

function RailItem({
  item, active, collapsed, onClick,
}: { item: VoucherEntry; active: boolean; collapsed: boolean; onClick: () => void }) {
  const body = (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 8,
        padding: collapsed ? '10px 0' : '7px 12px',
        margin: collapsed ? '2px 4px' : '1px 6px',
        borderRadius: 4,
        cursor: 'pointer',
        background: active ? '#e6f4ff' : 'transparent',
        color: active ? '#1677ff' : '#262626',
        borderLeft: active && !collapsed ? `3px solid ${item.color}` : '3px solid transparent',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <span style={{ fontSize: 16, color: active ? '#1677ff' : item.color, flexShrink: 0 }}>{item.icon}</span>
      {!collapsed && (
        <span style={{ fontSize: 12, lineHeight: 1.3, fontWeight: active ? 600 : 400 }}>
          {item.label}
        </span>
      )}
    </div>
  );
  return collapsed ? <Tooltip title={item.label} placement="left">{body}</Tooltip> : body;
}
