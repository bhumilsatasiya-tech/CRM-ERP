import { useState } from 'react';
import { Button, Input, InputNumber, Select, Space, Table, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { productApi } from '../../05-products/api/productsApi';

export interface InputRow {
  key: string;
  id?: number;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  qty_planned: number;
  rate: number;
  source_batch_no?: string;
  notes?: string;
}

export function totalInputCost(rows: InputRow[]): number {
  return rows.reduce((s, r) => s + (r.qty_planned || 0) * (r.rate || 0), 0);
}

interface Props {
  rows: InputRow[];
  onChange: (rows: InputRow[]) => void;
  readOnly?: boolean;
}

export default function ProductionInputsEditor({ rows, onChange, readOnly = false }: Props) {
  const add = () => onChange([...rows, { key: `new-${Date.now()}-${Math.random()}`, qty_planned: 1, rate: 0 }]);
  const update = (key: string, patch: Partial<InputRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => onChange(rows.filter((r) => r.key !== key));

  const onSearchProduct = async (q: string) => {
    if (!q) return [];
    const list = await productApi.lookup(q, 'raw', undefined, 20);
    return list.map((p) => ({
      value: Number(p.id),
      label: `${p.code} — ${p.name}`,
      product: {
        code: String(p.code),
        name: String(p.name),
        standard_cost: Number((p as { standard_cost?: number }).standard_cost ?? 0),
      },
    }));
  };

  const cols = [
    {
      title: 'Raw material', key: 'product',
      render: (_: unknown, row: InputRow) => (
        <RawProductPicker
          readOnly={readOnly}
          value={row.product_id}
          fallbackLabel={row.product_code ? `${row.product_code} — ${row.product_name ?? ''}` : undefined}
          onSearch={onSearchProduct}
          onPick={(opt) => update(row.key, {
            product_id: opt.value,
            product_code: opt.product.code,
            product_name: opt.product.name,
            rate: row.rate || opt.product.standard_cost,
          })}
        />
      ),
    },
    { title: 'Planned qty', key: 'qty_planned', width: 120,
      render: (_: unknown, row: InputRow) => (
        <InputNumber disabled={readOnly} min={0} step={0.001} value={row.qty_planned} onChange={(v) => update(row.key, { qty_planned: Number(v ?? 0) })} style={{ width: '100%' }} />
      ),
    },
    { title: 'Rate', key: 'rate', width: 110,
      render: (_: unknown, row: InputRow) => (
        <InputNumber disabled={readOnly} min={0} step={0.01} value={row.rate} onChange={(v) => update(row.key, { rate: Number(v ?? 0) })} style={{ width: '100%' }} />
      ),
    },
    { title: 'Line value', key: 'lv', width: 120, align: 'right' as const,
      render: (_: unknown, row: InputRow) => ((row.qty_planned || 0) * (row.rate || 0)).toFixed(2),
    },
    { title: 'Source batch', key: 'sb', width: 160,
      render: (_: unknown, row: InputRow) => (
        <Input disabled={readOnly} value={row.source_batch_no} onChange={(e) => update(row.key, { source_batch_no: e.target.value })} placeholder="Optional lot" />
      ),
    },
    { title: 'Notes', key: 'n',
      render: (_: unknown, row: InputRow) => (
        <Input disabled={readOnly} value={row.notes} onChange={(e) => update(row.key, { notes: e.target.value })} />
      ),
    },
    { title: '', key: 'rm', width: 50,
      render: (_: unknown, row: InputRow) => (
        <Button size="small" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => remove(row.key)} />
      ),
    },
  ];

  const total = totalInputCost(rows);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text strong>Inputs (raw materials consumed)</Typography.Text>
        {!readOnly && <Button icon={<PlusOutlined />} onClick={add}>Add input</Button>}
      </Space>
      <Table<InputRow> rowKey="key" dataSource={rows} columns={cols} pagination={false} size="small"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}><strong>Estimated material cost</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><strong>{total.toFixed(2)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={3}></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Space>
  );
}

interface PickerProps {
  readOnly: boolean;
  value?: number;
  fallbackLabel?: string;
  onSearch: (q: string) => Promise<Array<{ value: number; label: string; product: { code: string; name: string; standard_cost: number } }>>;
  onPick: (opt: { value: number; product: { code: string; name: string; standard_cost: number } }) => void;
}

function RawProductPicker({ readOnly, value, fallbackLabel, onSearch, onPick }: PickerProps) {
  const [opts, setOpts] = useState<Array<{ value: number; label: string; product: { code: string; name: string; standard_cost: number } }>>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q: string) => {
    setLoading(true);
    try { setOpts(await onSearch(q)); } finally { setLoading(false); }
  };

  return (
    <Select
      showSearch
      style={{ width: 280 }}
      placeholder="Search raw material..."
      disabled={readOnly}
      value={value ?? undefined}
      defaultActiveFirstOption={false}
      filterOption={false}
      loading={loading}
      onSearch={handleSearch}
      options={value && opts.length === 0 && fallbackLabel ? [{ value, label: fallbackLabel, product: { code: '', name: '', standard_cost: 0 } }] : opts}
      onChange={(_, opt) => onPick(opt as { value: number; product: { code: string; name: string; standard_cost: number } })}
    />
  );
}
