import { useState } from 'react';
import { Button, Input, InputNumber, Select, Space, Table, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { productApi } from '../../05-products/api/productsApi';

export interface ComponentRow {
  key: string;
  id?: number;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  uom_id?: number | null;
  qty: number;
  wastage_pct: number;
  notes?: string;
}

interface Props {
  rows: ComponentRow[];
  onChange: (rows: ComponentRow[]) => void;
  readOnly?: boolean;
}

export default function FormulaComponentsEditor({ rows, onChange, readOnly = false }: Props) {
  const add = () => onChange([...rows, { key: `new-${Date.now()}-${Math.random()}`, qty: 1, wastage_pct: 0 }]);
  const update = (key: string, patch: Partial<ComponentRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => onChange(rows.filter((r) => r.key !== key));

  const onSearchProduct = async (q: string) => {
    if (!q) return [];
    const list = await productApi.lookup(q, 'raw', undefined, 20);
    return list.map((p) => ({
      value: Number(p.id),
      label: `${p.code} — ${p.name}`,
      product: { code: String(p.code), name: String(p.name) },
    }));
  };

  const cols = [
    {
      title: 'Component (raw)', key: 'product',
      render: (_: unknown, row: ComponentRow) => (
        <ComponentPicker
          readOnly={readOnly}
          value={row.product_id}
          fallbackLabel={row.product_code ? `${row.product_code} — ${row.product_name ?? ''}` : undefined}
          onSearch={onSearchProduct}
          onPick={(opt) => update(row.key, { product_id: opt.value, product_code: opt.product.code, product_name: opt.product.name })}
        />
      ),
    },
    { title: 'Qty per recipe', key: 'qty', width: 130, render: (_: unknown, row: ComponentRow) => (
      <InputNumber disabled={readOnly} min={0} step={0.001} value={row.qty} onChange={(v) => update(row.key, { qty: Number(v ?? 0) })} style={{ width: '100%' }} />
    )},
    { title: 'Wastage %', key: 'w', width: 110, render: (_: unknown, row: ComponentRow) => (
      <InputNumber disabled={readOnly} min={0} max={100} step={0.5} value={row.wastage_pct} onChange={(v) => update(row.key, { wastage_pct: Number(v ?? 0) })} style={{ width: '100%' }} />
    )},
    { title: 'Notes', key: 'n', render: (_: unknown, row: ComponentRow) => (
      <Input disabled={readOnly} value={row.notes} onChange={(e) => update(row.key, { notes: e.target.value })} />
    )},
    { title: '', key: 'rm', width: 50, render: (_: unknown, row: ComponentRow) => (
      <Button size="small" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => remove(row.key)} />
    )},
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text strong>Components (raw materials)</Typography.Text>
        {!readOnly && <Button icon={<PlusOutlined />} onClick={add}>Add component</Button>}
      </Space>
      <Table<ComponentRow> rowKey="key" dataSource={rows} columns={cols} pagination={false} size="small" />
    </Space>
  );
}

interface PickerProps {
  readOnly: boolean;
  value?: number;
  fallbackLabel?: string;
  onSearch: (q: string) => Promise<Array<{ value: number; label: string; product: { code: string; name: string } }>>;
  onPick: (opt: { value: number; product: { code: string; name: string } }) => void;
}
function ComponentPicker({ readOnly, value, fallbackLabel, onSearch, onPick }: PickerProps) {
  const [opts, setOpts] = useState<Array<{ value: number; label: string; product: { code: string; name: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const handleSearch = async (q: string) => {
    setLoading(true);
    try { setOpts(await onSearch(q)); } finally { setLoading(false); }
  };
  return (
    <Select
      showSearch style={{ width: 280 }} placeholder="Search raw material..."
      disabled={readOnly} value={value ?? undefined}
      defaultActiveFirstOption={false} filterOption={false} loading={loading}
      onSearch={handleSearch}
      options={value && opts.length === 0 && fallbackLabel ? [{ value, label: fallbackLabel, product: { code: '', name: '' } }] : opts}
      onChange={(_, opt) => onPick(opt as { value: number; product: { code: string; name: string } })}
    />
  );
}
