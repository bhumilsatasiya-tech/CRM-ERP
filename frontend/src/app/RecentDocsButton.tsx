import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Dropdown, Empty, Tooltip, Tag, Badge } from 'antd';
import { HistoryOutlined, PushpinFilled, PushpinOutlined, ClearOutlined, RightOutlined } from '@ant-design/icons';
import { getRecent, getPinned, isPinned, togglePin, clearRecent, recordVisit, type RecentDoc } from './recentDocs';

const TYPE_LABEL: Record<string, string> = {
  'invoice':                'Invoice',
  'quotation':              'Quote',
  'sales-order':            'SO',
  'purchase-order':         'PO',
  'grn':                    'GRN',
  'purchase-invoice':       'PI',
  'production-batch':       'Batch',
  'export-invoice':         'EI',
  'packing-list':           'PL',
  'tax-invoice':            'TI',
  'shipping-bill':          'SB',
  'irm':                    'IRM',
  'lodgement':              'Lodge',
  'journal-entry':          'JE',
  'inter-company-invoice':  'ICI',
};

const TYPE_COLOR: Record<string, string> = {
  'invoice': '#1677ff', 'quotation': '#722ed1', 'sales-order': '#1677ff',
  'purchase-order': '#fa8c16', 'grn': '#fa8c16', 'purchase-invoice': '#fa8c16',
  'production-batch': '#13c2c2', 'export-invoice': '#eb2f96', 'packing-list': '#eb2f96',
  'tax-invoice': '#eb2f96', 'shipping-bill': '#eb2f96',
  'irm': '#13c2c2', 'lodgement': '#13c2c2',
  'journal-entry': '#595959', 'inter-company-invoice': '#722ed1',
};

/**
 * Topbar Recent + Pinned dropdown. Auto-tracks every doc detail page visit and
 * shows the last 10 + any pinned ones. One-click pin/unpin, instant re-open.
 *
 * Replaces the "where was I 10 minutes ago?" friction across long sessions.
 */
export default function RecentDocsButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<RecentDoc[]>(getRecent());
  const [pinned, setPinned] = useState<RecentDoc[]>(getPinned());

  // Auto-record visits to /invoices/123/edit, etc.
  useEffect(() => {
    recordVisit(location.pathname);
  }, [location.pathname]);

  // Listen for updates from anywhere (other tabs, manual record)
  useEffect(() => {
    const refresh = () => { setRecent(getRecent()); setPinned(getPinned()); };
    window.addEventListener('crm-erp:recent-docs-updated', refresh);
    return () => window.removeEventListener('crm-erp:recent-docs-updated', refresh);
  }, []);

  // De-duplicate: don't show a recent that's also pinned
  const pinnedPaths = new Set(pinned.map((d) => d.path));
  const recentNoDups = recent.filter((d) => !pinnedPaths.has(d.path));

  const totalCount = recentNoDups.length + pinned.length;

  const dropdown = (
    <div style={{
      width: 320, maxHeight: 480, overflowY: 'auto',
      background: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', borderRadius: 8,
    }}>
      {pinned.length > 0 && (
        <>
          <SectionLabel>Pinned</SectionLabel>
          {pinned.map((d) => <DocRow key={`p-${d.path}`} doc={d} pinned onClick={() => { navigate(d.path); }} />)}
        </>
      )}
      {recentNoDups.length > 0 && (
        <>
          <SectionLabel>Recent</SectionLabel>
          {recentNoDups.map((d) => <DocRow key={`r-${d.path}`} doc={d} pinned={false} onClick={() => { navigate(d.path); }} />)}
        </>
      )}
      {totalCount === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents opened yet" style={{ padding: 32 }} />
      )}
      {recent.length > 0 && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="link" size="small" icon={<ClearOutlined />} onClick={clearRecent}>Clear recent</Button>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title="Recent documents (pinned + last 10)">
      <Dropdown popupRender={() => dropdown} trigger={['click']} placement="bottomRight">
        <Badge count={totalCount} size="small" offset={[-2, 4]} color="#1677ff">
          <Button icon={<HistoryOutlined />} type="text" size="middle" />
        </Badge>
      </Dropdown>
    </Tooltip>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '10px 14px 4px', fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
      color: '#8c8c8c', textTransform: 'uppercase',
    }}>{children}</div>
  );
}

function DocRow({ doc, pinned, onClick }: { doc: RecentDoc; pinned: boolean; onClick: () => void }) {
  const label = TYPE_LABEL[doc.type] ?? doc.type;
  const color = TYPE_COLOR[doc.type] ?? '#595959';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', cursor: 'pointer',
        borderTop: '1px solid #fafafa',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Tag style={{
        margin: 0, fontSize: 10, padding: '0 6px', lineHeight: '18px', minWidth: 42, textAlign: 'center',
        background: color, color: '#fff', borderColor: color,
      }}>{label}</Tag>
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#222', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {doc.code}
      </span>
      <Button
        type="text" size="small"
        icon={pinned ? <PushpinFilled style={{ color: '#fa8c16' }} /> : <PushpinOutlined />}
        onClick={(e) => { e.stopPropagation(); togglePin(doc); }}
      />
      <RightOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />
    </div>
  );
}
