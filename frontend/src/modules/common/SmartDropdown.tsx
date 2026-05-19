import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Divider, Empty, Select, Space, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CSSProperties, UIEvent } from 'react';

export interface SmartDropdownItem<T = unknown> {
  value: number;
  label: string;
  raw: T;
}

export type SmartDropdownFetcher<T> = (
  q: string,
  offset: number,
  limit: number,
) => Promise<SmartDropdownItem<T>[]>;

interface Props<T> {
  /** Currently selected id (controlled). */
  value?: number | null;
  /** Fired when user picks an item (or clears). */
  onChange?: (value: number | undefined, item?: SmartDropdownItem<T>) => void;
  /** Async fetcher — paginated by (offset, limit), filtered by `q`. */
  fetcher: SmartDropdownFetcher<T>;
  /** Page size. Default 10. */
  pageSize?: number;
  placeholder?: string;
  /** Label to render when `value` is set but not present in lazy-loaded options (edit mode). */
  fallbackLabel?: string;
  /** If provided, renders pinned "+ Add new" footer + empty-state CTA. */
  onAddNew?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
  allowClear?: boolean;
  style?: CSSProperties;
  /** Bumped externally to force a re-fetch (e.g., after inline-create). Default 0. */
  refreshKey?: number;
}

// Zero debounce — local in-memory cache filter is sync (microseconds). Typing must
// feel instant; we accept some duplicate API requests during the brief window after
// app boot before the prefetch populates the cache (backend has 60s Cache::remember
// on lookups anyway, so duplicates are cheap).
const DEBOUNCE_MS = 0;
const SCROLL_THRESHOLD_PX = 32;

export default function SmartDropdown<T = unknown>({
  value,
  onChange,
  fetcher,
  pageSize = 10,
  placeholder = 'Search...',
  fallbackLabel,
  onAddNew,
  addNewLabel = '+ Add new',
  disabled = false,
  allowClear = true,
  style,
  refreshKey = 0,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SmartDropdownItem<T>[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const loadPage = useCallback(async (q: string, offset: number) => {
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const rows = await fetcher(q, offset, pageSize);
      if (myReqId !== reqIdRef.current) return; // stale
      setHasMore(rows.length >= pageSize);
      setItems((prev) => offset === 0 ? rows : [...prev, ...rows]);
    } catch {
      if (myReqId !== reqIdRef.current) return;
      setHasMore(false);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }, [fetcher, pageSize]);

  // Initial load when popup opens (Rule 2: A-Z first 10).
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setHasMore(false);
    void loadPage('', 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refreshKey]);

  // Typeahead search — no debounce (DEBOUNCE_MS=0 → call straight away so the local
  // cache filter renders on the SAME tick as the keystroke for zero perceived lag).
  const onSearch = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (DEBOUNCE_MS === 0) {
      setItems([]);
      setHasMore(false);
      void loadPage(q, 0);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setItems([]);
      setHasMore(false);
      void loadPage(q, 0);
    }, DEBOUNCE_MS);
  };

  // Lazy-load more on scroll near bottom (Rule 3).
  const onPopupScroll = (e: UIEvent<HTMLDivElement>) => {
    if (loading || !hasMore) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
      void loadPage(query, items.length);
    }
  };

  const options = useMemo(() => {
    const opts: { value: number; label: string }[] = items.map((i) => ({ value: i.value, label: i.label }));
    if (value != null && fallbackLabel && !items.some((i) => i.value === value)) {
      opts.unshift({ value, label: fallbackLabel });
    }
    return opts;
  }, [items, value, fallbackLabel]);

  const itemsByValue = useMemo(() => {
    const m = new Map<number, SmartDropdownItem<T>>();
    items.forEach((i) => m.set(i.value, i));
    return m;
  }, [items]);

  const handleChange = (v: number | undefined) => {
    if (v == null) { onChange?.(undefined, undefined); return; }
    onChange?.(v, itemsByValue.get(v));
  };

  const dropdownRender = (menu: React.ReactNode) => (
    <>
      {loading && items.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={onAddNew ? 'No results. Click + Add new below.' : 'No results.'}
          style={{ padding: 12 }}
        />
      ) : menu}
      {loading && items.length > 0 && (
        <div style={{ padding: 8, textAlign: 'center' }}><Spin size="small" /></div>
      )}
      {onAddNew && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <Space style={{ padding: '4px 8px 8px', width: '100%' }}>
            <Button
              type="link"
              icon={<PlusOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onAddNew(); }}
              style={{ paddingLeft: 4 }}
            >
              {addNewLabel}
            </Button>
          </Space>
        </>
      )}
    </>
  );

  return (
    <Select<number>
      showSearch
      open={open}
      onDropdownVisibleChange={setOpen}
      value={value ?? undefined}
      onChange={handleChange}
      onSearch={onSearch}
      onPopupScroll={onPopupScroll}
      filterOption={false}
      defaultActiveFirstOption={false}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      style={style ?? { width: '100%' }}
      options={options}
      dropdownRender={dropdownRender}
      notFoundContent={loading ? <Spin size="small" /> : null}
    />
  );
}
