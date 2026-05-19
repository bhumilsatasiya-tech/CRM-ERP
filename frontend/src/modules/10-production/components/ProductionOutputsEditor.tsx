import { useState } from 'react';
import { Button, DatePicker, Input, InputNumber, Select, Space, Table, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { productApi } from '../../05-products/api/productsApi';
import type { OutputType } from '../types/production.types';

export interface OutputRow {
  key: string;
  id?: number;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  output_type: OutputType;
  qty_planned: number;
  rate: number;
  output_batch_no?: string;
  expiry_date?: string;
  notes?: string;
}

const TYPE_OPTIONS: Array<{ value: OutputType; label: string }> = [
  { value: 'finished',   label: 'Finished' },
  { value: 'by_product', label: 'By-product' },
  { value: 'scrap',      label: 'Scrap' },
];

interface Props {
  rows: OutputRow[];
  onChange: (rows: OutputRow[]) => void;
  readOnly?: boolean;
}

export default function ProductionOutputsEditor({ rows, onChange, readOnly = false }: Props) {
  const add = () => onChange([...rows, { key: `new-${Date.now()}-${Math.random()}`, output_type: 'finished', qty_planned: 1, rate: 0 }]);
  const update = (key: string, patch: Partial<OutputRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => onChange(rows.filter((r) => r.key !== key));

  const onSearchProduct = async (q: string) => {
    if (!q) return [];
    const list = await productApi.lookup(q, undefined, undefined, 20);
    return list.map((p) => ({
      value: Number(p.id),
      label: `${p.code} — ${p.name}`,
      product: {
        code: String(p.code),
        name: String(p.name),
        standard_price: Number((p as { standard_price?: number }).standard_price ?? 0),
      },
    }));
  };

  const cols = [
    {
      title: 'Output product', key: 'product',
      render: (_: unknown, row: OutputRow) => (
        <OutputProductPicker
          readOnly={readOnly}
          value={row.product_id}
          fallbackLabel={row.product_code ? `${row.product_code} — ${row.product_name ?? ''}` : undefined}
          onSearch={onSearchProduct}
          onPick={(opt) => update(row.key, {
            product_id: opt.value,
            product_code: opt.product.code,
            product_name: opt.product.name,
            rate: row.rate || opt.product.standard_price,
          })}
        />
      ),
    },
    { title: 'Type', key: 'type', width: 130,
      render: (_: unknown, row: OutputRow) => (
        <Select disabled={readOnly} value={row.output_type} options={TYPE_OPTIONS} onChange={(v: OutputType) => update(row.key, { output_type: v })} style={{ width: '100%' }} />
      ),
    },
    { title: 'Planned qty', key: 'qty_planned', width: 120,
      render: (_: unknown, row: OutputRow) => (
        <InputNumber disabled={readOnly} min={0} step={0.001} value={row.qty_planned} onChange={(v) => update(row.key, { qty_planned: Number(v ?? 0) })} style={{ width: '100%' }} />
      ),
    },
    { title: 'Rate (auto)', key: 'rate', width: 110,
      render: (_: unknown, row: OutputRow) => (
        <InputNumber disabled={readOnly} min={0} step={0.01} value={row.rate} onChange={(v) => update(row.key, { rate: Number(v ?? 0) })} style={{ width: '100%' }} />
      ),
    },
    { title: 'Output batch', key: 'ob', width: 140,
      render: (_: unknown, row: OutputRow) => (
        <Input disabled={readOnly} value={row.output_batch_no} onChange={(e) => update(row.key, { output_batch_no: e.target.value })} placeholder="Header default" />
      ),
    },
    { title: 'Expiry', key: 'exp', width: 150,
      render: (_: unknown, row: OutputRow) => (
        <DatePicker
          disabled={readOnly}
          value={row.expiry_date ? dayjs(row.expiry_date) : null}
          onChange={(d) => update(row.key, { expiry_date: d ? d.format('YYYY-MM-DD') : undefined })}
          style={{ width: '100%' }}
        />
      ),
    },
    { title: 'Notes', key: 'n',
      render: (_: unknown, row: OutputRow) => (
        <Input disabled={readOnly} value={row.notes} onChange={(e) => update(row.key, { notes: e.target.value })} />
      ),
    },
    { title: '', key: 'rm', width: 50,
      render: (_: unknown, row: OutputRow) => (
        <Button size="small" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => remove(row.key)} />
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text strong>Outputs (finished / by-product / scrap)</Typography.Text>
        {!readOnly && <Button icon={<PlusOutlined />} onClick={add}>Add output</Button>}
      </Space>
      <Table<OutputRow> rowKey="key" dataSource={rows} columns={cols} pagination={false} size="small" />
    </Space>
  );
}

interface PickerProps {
  readOnly: boolean;
  value?: number;
  fallbackLabel?: string;
  onSearch: (q: string) => Promise<Array<{ value: number; label: string; product: { code: string; name: string; standard_price: number } }>>;
  onPick: (opt: { value: number; product: { code: string; name: string; standard_price: number } }) => void;
}

function OutputProductPicker({ readOnly, value, fallbackLabel, onSearch, onPick }: PickerProps) {
  const [opts, setOpts] = useState<Array<{ value: number; label: string; product: { code: string; name: string; standard_price: number } }>>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q: string) => {
    setLoading(true);
    try { setOpts(await onSearch(q)); } finally { setLoading(false); }
  };

  return (
    <Select
      showSearch
      style={{ width: 280 }}
      placeholder="Search product..."
      disabled={readOnly}
      value={value ?? undefined}
      defaultActiveFirstOption={false}
      filterOption={false}
      loading={loading}
      onSearch={handleSearch}
      options={value && opts.length === 0 && fallbackLabel ? [{ value, label: fallbackLabel, product: { code: '', name: '', standard_price: 0 } }] : opts}
      onChange={(_, opt) => onPick(opt as { value: number; product: { code: string; name: string; standard_price: number } })}
    />
  );
}
