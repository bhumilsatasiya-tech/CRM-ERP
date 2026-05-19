import { useState } from 'react';
import { categoryApi } from '../05-products/api/productsApi';
import SmartDropdown, { type SmartDropdownItem } from './SmartDropdown';
import InlineCreateCategoryModal from './InlineCreateCategoryModal';
import type { ProductCategory } from '../05-products/types/products.types';
import { filter as filterLookup, getAll, isReady } from '../../app/lookupStore';

interface CategoryRaw {
  code?: string | null;
  name?: string | null;
  depth?: number;
}

interface Props {
  value?: number | null;
  onChange?: (value: number | undefined) => void;
  onCategorySelect?: (cat: Partial<ProductCategory> | undefined) => void;
  fallbackLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  style?: React.CSSProperties;
}

export default function CategorySmartDropdown({ value, onChange, onCategorySelect, fallbackLabel, placeholder = 'Search category...', disabled, allowClear = true, style }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcher = async (q: string, offset: number, limit: number): Promise<SmartDropdownItem<CategoryRaw>[]> => {
    if (isReady('categories')) {
      const rows = filterLookup('categories', q, { limit, offset });
      return rows.map((c) => ({
        value: Number(c.id),
        label: `${c.code} — ${c.name}`,
        raw: { code: c.code, name: c.name, depth: (c as { depth?: number }).depth },
      }));
    }
    void getAll('categories');
    const list = await categoryApi.lookup(q, limit, offset);
    return list.map((c) => ({
      value: Number(c.id),
      label: `${c.code} — ${c.name}`,
      raw: { code: c.code, name: c.name, depth: c.depth },
    }));
  };

  return (
    <>
      <SmartDropdown<CategoryRaw>
        value={value}
        onChange={(v, item) => {
          onChange?.(v);
          onCategorySelect?.(item && v != null ? { id: v, code: item.raw.code ?? undefined, name: item.raw.name ?? undefined, depth: item.raw.depth } : undefined);
        }}
        fetcher={fetcher}
        placeholder={placeholder}
        fallbackLabel={fallbackLabel}
        disabled={disabled}
        allowClear={allowClear}
        style={style}
        refreshKey={refreshKey}
        onAddNew={() => setCreateOpen(true)}
        addNewLabel="+ Add new category"
      />
      <InlineCreateCategoryModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(c) => {
          setCreateOpen(false);
          setRefreshKey((k) => k + 1);
          onChange?.(c.id);
          onCategorySelect?.(c);
        }}
      />
    </>
  );
}
