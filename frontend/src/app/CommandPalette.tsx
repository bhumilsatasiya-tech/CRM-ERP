import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input, Empty, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ContactsOutlined, ShopOutlined, FileDoneOutlined, BankOutlined, DollarOutlined,
  FileTextOutlined, AppstoreOutlined, SettingOutlined, ThunderboltOutlined,
  ClockCircleOutlined, RightOutlined, SearchOutlined,
} from '@ant-design/icons';
import { filter as filterLookup, getAll, isReady, type LookupKind, type LookupRow } from './lookupStore';
import {
  STATIC_COMMANDS, getRecentCommandIds, recordCommandUse, type PaletteCommand,
} from './commandRegistry';

/**
 * Universal Ctrl+K Command Palette.
 *
 * Lets the user type ANYTHING and jump to it:
 *   - Pages (Dashboard, Invoices, Trial Balance, …)
 *   - New X actions ("new invoice", "new partner")
 *   - Voucher Drawer tabs (Receipt, Supplier Payment, …)
 *   - Live entity search: partners, products, accounts (from in-memory lookupStore — zero network)
 *   - Recent commands across reloads
 *
 * UX rules:
 *   - Open  with Ctrl+K / Cmd+K (handled in GlobalKeyboard via window event)
 *   - Close with Esc
 *   - Navigate with ↑ / ↓ — selection auto-scrolls into view
 *   - Run    with Enter
 *   - Click any row to run it
 *
 * Filter is a fast substring match across title + keywords + entity name/code/gst.
 * Sub-300 chars typically: blank state shows recent + top pages; one keystroke filters
 * the entire universe instantly because the lookupStore is in-memory.
 */

type Section = { key: string; label: string; items: PaletteItem[] };
type PaletteItem =
  | (PaletteCommand & { kind: 'command' })
  | { kind: 'entity'; id: string; title: string; subtitle?: string; route: string; entityKind: LookupKind };

const GROUP_ORDER: Record<string, number> = {
  recent: 0, new: 10, voucher: 20, partner: 30, product: 40, account: 50, page: 60, setting: 70,
};

const GROUP_ICON: Record<string, JSX.Element> = {
  recent:  <ClockCircleOutlined />,
  new:     <ThunderboltOutlined style={{ color: '#52c41a' }} />,
  voucher: <DollarOutlined style={{ color: '#fa8c16' }} />,
  partner: <ContactsOutlined style={{ color: '#1677ff' }} />,
  product: <ShopOutlined style={{ color: '#722ed1' }} />,
  account: <BankOutlined style={{ color: '#13c2c2' }} />,
  page:    <AppstoreOutlined style={{ color: '#595959' }} />,
  setting: <SettingOutlined style={{ color: '#8c8c8c' }} />,
};

const GROUP_LABEL: Record<string, string> = {
  recent: 'Recent', new: 'Create new', voucher: 'Quick voucher', partner: 'Partners',
  product: 'Products', account: 'Accounts', page: 'Pages', setting: 'Settings',
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Open / close via global event so any code (GlobalKeyboard, button) can trigger it.
  useEffect(() => {
    const onOpen = () => { setOpen(true); setQuery(''); setActive(0); };
    const onClose = () => setOpen(false);
    window.addEventListener('crm-erp:palette-open', onOpen);
    window.addEventListener('crm-erp:palette-close', onClose);
    return () => {
      window.removeEventListener('crm-erp:palette-open', onOpen);
      window.removeEventListener('crm-erp:palette-close', onClose);
    };
  }, []);

  // Warm partners/products on first open in case prefetch hasn't run yet.
  useEffect(() => {
    if (open) {
      if (!isReady('partners')) void getAll('partners');
      if (!isReady('products')) void getAll('products');
      if (!isReady('accounts')) void getAll('accounts');
      // Refocus input after the modal animates in
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  const sections = useMemo<Section[]>(() => buildSections(query), [query]);
  const flatItems = useMemo<PaletteItem[]>(() => sections.flatMap((s) => s.items), [sections]);

  // Reset highlight when filter changes
  useEffect(() => { setActive(0); }, [query]);

  // Keyboard navigation inside the palette
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = flatItems[active];
        if (it) runItem(it);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, flatItems, active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll the active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const runItem = (it: PaletteItem) => {
    if (it.kind === 'command') {
      recordCommandUse(it.id);
      if (it.route) navigate(it.route);
      else if (it.run) it.run();
    } else {
      recordCommandUse(`entity:${it.entityKind}:${it.id}`);
      navigate(it.route);
    }
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      closable={false}
      destroyOnClose
      width={680}
      style={{ top: 80 }}
      bodyStyle={{ padding: 0 }}
      maskStyle={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 16px' }}>
        <Input
          ref={(r) => { inputRef.current = r?.input ?? null; }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search anything — partners, products, invoices, pages, actions…"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          variant="borderless"
          size="large"
          autoFocus
        />
      </div>

      <div ref={listRef} style={{ maxHeight: 460, overflowY: 'auto', padding: '4px 0' }}>
        {flatItems.length === 0 ? (
          <Empty
            description={`No results for "${query}"`}
            style={{ padding: '40px 0' }}
            imageStyle={{ height: 60 }}
          />
        ) : (
          sections.map((sec) => (
            <div key={sec.key}>
              <div style={{
                padding: '8px 16px 4px',
                fontSize: 11,
                fontWeight: 600,
                color: '#8c8c8c',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {GROUP_ICON[sec.key]} {sec.label}
              </div>
              {sec.items.map((it) => {
                const idx = flatItems.indexOf(it);
                const isActive = idx === active;
                return (
                  <div
                    key={`${sec.key}-${it.id}`}
                    data-idx={idx}
                    onClick={() => runItem(it)}
                    onMouseEnter={() => setActive(idx)}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: isActive ? '#e6f4ff' : 'transparent',
                      borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'background 80ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 14, opacity: 0.85, display: 'inline-flex' }}>
                        {iconFor(it)}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: '#222',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {it.title}
                        </div>
                        {it.subtitle && (
                          <div style={{
                            fontSize: 11, color: '#8c8c8c',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {it.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {it.kind === 'command' && it.shortcut && (
                        <Tag style={{
                          margin: 0, fontSize: 10, padding: '0 6px', lineHeight: '18px',
                          background: '#fafafa', color: '#595959', borderColor: '#e8e8e8',
                          fontFamily: 'monospace',
                        }}>
                          {it.shortcut}
                        </Tag>
                      )}
                      {isActive && <RightOutlined style={{ color: '#1677ff', fontSize: 11 }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div style={{
        borderTop: '1px solid #f0f0f0',
        padding: '8px 16px',
        fontSize: 11,
        color: '#8c8c8c',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        background: '#fafafa',
      }}>
        <span><kbd style={kbd}>↑↓</kbd> navigate &nbsp; <kbd style={kbd}>Enter</kbd> open &nbsp; <kbd style={kbd}>Esc</kbd> close</span>
        <span>Find anything · powered by Ctrl+K</span>
      </div>
    </Modal>
  );
}

const kbd: React.CSSProperties = {
  fontFamily: 'monospace',
  padding: '1px 4px',
  border: '1px solid #d9d9d9',
  borderRadius: 3,
  background: '#fff',
  fontSize: 10,
};

function iconFor(it: PaletteItem): JSX.Element {
  if (it.kind === 'entity') {
    if (it.entityKind === 'partners') return <ContactsOutlined style={{ color: '#1677ff' }} />;
    if (it.entityKind === 'products') return <ShopOutlined style={{ color: '#722ed1' }} />;
    if (it.entityKind === 'accounts') return <BankOutlined style={{ color: '#13c2c2' }} />;
    return <FileTextOutlined />;
  }
  switch (it.group) {
    case 'New':     return <ThunderboltOutlined style={{ color: '#52c41a' }} />;
    case 'Voucher': return <DollarOutlined style={{ color: '#fa8c16' }} />;
    case 'Setting': return <SettingOutlined style={{ color: '#8c8c8c' }} />;
    case 'Page':    return <AppstoreOutlined style={{ color: '#595959' }} />;
    default:        return <FileDoneOutlined />;
  }
}

/**
 * Build the section list for the current query.
 *
 * Empty query: Recent (8) + Create new (top 8) + Pages (top 8) — fast jumping-off point.
 * Non-empty: filter EVERYTHING — commands by title/keywords, entities by name/code/gst.
 */
function buildSections(query: string): Section[] {
  const q = query.trim().toLowerCase();
  const sections: Section[] = [];

  if (q === '') {
    const recentIds = getRecentCommandIds();
    const recentItems: PaletteItem[] = recentIds
      .map((id) => {
        // entity:<kind>:<id>
        if (id.startsWith('entity:')) {
          const [, kind, eid] = id.split(':');
          const row = filterLookup(kind as LookupKind, '', { limit: 5000 }).find((r) => String(r.id) === eid);
          if (!row) return null;
          return entityToItem(kind as LookupKind, row);
        }
        const cmd = STATIC_COMMANDS.find((c) => c.id === id);
        return cmd ? { ...cmd, kind: 'command' as const } : null;
      })
      .filter(Boolean) as PaletteItem[];
    if (recentItems.length) {
      sections.push({ key: 'recent', label: GROUP_LABEL.recent, items: recentItems });
    }

    sections.push({
      key: 'new',
      label: GROUP_LABEL.new,
      items: STATIC_COMMANDS.filter((c) => c.group === 'New').slice(0, 8).map((c) => ({ ...c, kind: 'command' as const })),
    });
    sections.push({
      key: 'page',
      label: GROUP_LABEL.page,
      items: STATIC_COMMANDS.filter((c) => c.group === 'Page').slice(0, 8).map((c) => ({ ...c, kind: 'command' as const })),
    });
    return sections;
  }

  // Non-empty query: filter commands + entities
  const cmdHits = STATIC_COMMANDS.filter((c) => {
    const haystack = (c.title + ' ' + (c.keywords ?? '')).toLowerCase();
    return haystack.includes(q);
  });

  // Bucket commands by group
  const byGroup: Record<string, PaletteCommand[]> = {};
  for (const c of cmdHits) {
    const k = c.group.toLowerCase();
    if (!byGroup[k]) byGroup[k] = [];
    byGroup[k].push(c);
  }

  // Entities — lookup store filter (synchronous, zero network)
  const partnerHits = filterLookup('partners', q, { limit: 8 });
  const productHits = filterLookup('products', q, { limit: 8 });
  const accountHits = filterLookup('accounts', q, { limit: 6 });

  const buckets: Section[] = [];
  if (partnerHits.length) {
    buckets.push({
      key: 'partner',
      label: GROUP_LABEL.partner,
      items: partnerHits.map((r) => entityToItem('partners', r)),
    });
  }
  if (productHits.length) {
    buckets.push({
      key: 'product',
      label: GROUP_LABEL.product,
      items: productHits.map((r) => entityToItem('products', r)),
    });
  }
  if (accountHits.length) {
    buckets.push({
      key: 'account',
      label: GROUP_LABEL.account,
      items: accountHits.map((r) => entityToItem('accounts', r)),
    });
  }

  // Command buckets
  for (const k of ['new', 'voucher', 'page', 'setting']) {
    const items = byGroup[k];
    if (!items?.length) continue;
    buckets.push({
      key: k,
      label: GROUP_LABEL[k],
      items: items.slice(0, 10).map((c) => ({ ...c, kind: 'command' as const })),
    });
  }

  // Sort sections by predefined priority order
  buckets.sort((a, b) => (GROUP_ORDER[a.key] ?? 99) - (GROUP_ORDER[b.key] ?? 99));
  return buckets;
}

function entityToItem(kind: LookupKind, row: LookupRow): PaletteItem {
  const id = String(row.id);
  const title = row.name ?? row.code ?? `#${row.id}`;
  const subtitle = [row.code, row.gst_no, row.type].filter(Boolean).join(' · ');
  const route =
    kind === 'partners' ? `/partners/${row.id}` :
    kind === 'products' ? `/products/${row.id}` :
    kind === 'accounts' ? `/accounts/${row.id}` :
    '/';
  return { kind: 'entity', id, title, subtitle, route, entityKind: kind };
}
