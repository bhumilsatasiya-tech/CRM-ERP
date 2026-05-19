import { useState } from 'react';
import { partnerApi } from '../04-crm/api/partnerApi';
import SmartDropdown, { type SmartDropdownItem } from './SmartDropdown';
import InlineCreatePartnerModal from './InlineCreatePartnerModal';
import type { Partner, PartnerType } from '../04-crm/types/crm.types';
import { filter as filterLookup, getAll, isReady } from '../../app/lookupStore';

interface PartnerRaw {
  code?: string | null;
  name?: string | null;
  country?: string | null;
  tax_treatment?: string | null;
  gst_no?: string | null;
}

interface Props {
  /** AntD Form.Item-injected (or directly controlled). */
  value?: number | null;
  /** AntD Form.Item-injected (or directly controlled) — fires with just the id. */
  onChange?: (value: number | undefined) => void;
  /** Side-effect callback with the full partner snapshot. Survives Form.Item cloning. */
  onPartnerSelect?: (partner: Partial<Partner> | undefined) => void;
  /** Filter the lookup by partner type. Pass undefined for "all". */
  type?: PartnerType;
  placeholder?: string;
  /** Label to show when value is set but not yet in the lazy-loaded list (edit mode). */
  fallbackLabel?: string;
  disabled?: boolean;
  allowClear?: boolean;
  style?: React.CSSProperties;
  /** Hide the inline + Add new partner footer. */
  disableAddNew?: boolean;
}

export default function PartnerSmartDropdown({
  value, onChange, onPartnerSelect, type, placeholder = 'Search partner...', fallbackLabel,
  disabled, allowClear, style, disableAddNew = false,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcher = async (q: string, offset: number, limit: number): Promise<SmartDropdownItem<PartnerRaw>[]> => {
    // Fast path: filter the in-memory cache synchronously (zero network).
    if (isReady('partners')) {
      const rows = filterLookup('partners', q, { type, limit, offset });
      return rows.map((p) => ({
        value: Number(p.id),
        label: `${p.code} — ${p.name}`,
        raw: { code: p.code, name: p.name, country: p.country, tax_treatment: p.tax_treatment, gst_no: p.gst_no },
      }));
    }
    // First time / cache empty: prime in background AND fall back to the API for this call.
    void getAll('partners');
    const list = await partnerApi.lookup(q, type, limit, offset);
    return list.map((p) => ({
      value: Number(p.id),
      label: `${p.code} — ${p.name}`,
      raw: {
        code: p.code,
        name: p.name,
        country: p.country,
        tax_treatment: p.tax_treatment,
        gst_no: p.gst_no,
      },
    }));
  };

  return (
    <>
      <SmartDropdown<PartnerRaw>
        value={value}
        onChange={(v, item) => {
          onChange?.(v);
          onPartnerSelect?.(item && v != null ? {
            id: v,
            code: item.raw.code ?? undefined,
            name: item.raw.name ?? undefined,
            country: item.raw.country ?? undefined,
            tax_treatment: item.raw.tax_treatment as Partner['tax_treatment'] | undefined,
            gst_no: item.raw.gst_no ?? undefined,
          } : undefined);
        }}
        fetcher={fetcher}
        placeholder={placeholder}
        fallbackLabel={fallbackLabel}
        disabled={disabled}
        allowClear={allowClear}
        style={style}
        refreshKey={refreshKey}
        onAddNew={disableAddNew ? undefined : () => setCreateOpen(true)}
        addNewLabel="+ Add new partner"
      />
      <InlineCreatePartnerModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(p) => {
          setCreateOpen(false);
          setRefreshKey((k) => k + 1);
          onChange?.(p.id);
          onPartnerSelect?.(p);
        }}
        defaultType={type ?? 'client'}
        lockType={Boolean(type)}
      />
    </>
  );
}
