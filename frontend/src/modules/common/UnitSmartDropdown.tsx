import { useState } from 'react';
import { unitApi } from '../05-products/api/productsApi';
import SmartDropdown, { type SmartDropdownItem } from './SmartDropdown';
import InlineCreateUnitModal from './InlineCreateUnitModal';
import type { ProductUnit, UnitType } from '../05-products/types/products.types';
import { filter as filterLookup, getAll, isReady } from '../../app/lookupStore';

interface UnitRaw {
  code?: string | null;
  name?: string | null;
  symbol?: string | null;
  type?: UnitType | null;
}

interface Props {
  value?: number | null;
  onChange?: (value: number | undefined) => void;
  onUnitSelect?: (unit: Partial<ProductUnit> | undefined) => void;
  /** Filter by unit type (weight/volume/etc.). Pass undefined for all. */
  type?: UnitType;
  fallbackLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  style?: React.CSSProperties;
}

export default function UnitSmartDropdown({ value, onChange, onUnitSelect, type, fallbackLabel, placeholder = 'Search unit...', disabled, allowClear = true, style }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcher = async (q: string, offset: number, limit: number): Promise<SmartDropdownItem<UnitRaw>[]> => {
    if (isReady('units')) {
      const rows = filterLookup('units', q, { type, limit, offset });
      return rows.map((u) => ({
        value: Number(u.id),
        label: `${u.symbol} — ${u.name}`,
        raw: { code: u.code, name: u.name, symbol: u.symbol, type: u.type as UnitType | null },
      }));
    }
    void getAll('units');
    const list = await unitApi.lookup(q, type, limit, offset);
    return list.map((u) => ({
      value: Number(u.id),
      label: `${u.symbol} — ${u.name}`,
      raw: { code: u.code, name: u.name, symbol: u.symbol, type: u.type },
    }));
  };

  return (
    <>
      <SmartDropdown<UnitRaw>
        value={value}
        onChange={(v, item) => {
          onChange?.(v);
          onUnitSelect?.(item && v != null ? { id: v, code: item.raw.code ?? undefined, name: item.raw.name ?? undefined, symbol: item.raw.symbol ?? undefined, type: item.raw.type ?? undefined } : undefined);
        }}
        fetcher={fetcher}
        placeholder={placeholder}
        fallbackLabel={fallbackLabel}
        disabled={disabled}
        allowClear={allowClear}
        style={style}
        refreshKey={refreshKey}
        onAddNew={() => setCreateOpen(true)}
        addNewLabel="+ Add new unit"
      />
      <InlineCreateUnitModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(u) => {
          setCreateOpen(false);
          setRefreshKey((k) => k + 1);
          onChange?.(u.id);
          onUnitSelect?.(u);
        }}
      />
    </>
  );
}
