import { useState } from 'react';
import { Button, Input, InputNumber, Space, Table, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { productApi } from '../05-products/api/productsApi';
import SmartDropdown, { type SmartDropdownItem } from './SmartDropdown';
import InlineCreateProductModal from './InlineCreateProductModal';
import type { Product, ProductType } from '../05-products/types/products.types';

export interface DocLine {
  key: string;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  hsn_code?: string;      // HSN/SAC — Indian GST + customs
  qty: number;
  shipper_qty?: number;   // export only — number of packages
  shipper_unit?: string;  // export only — BOX/CARTON/PALLET
  rate: number;
  tax_rate: number;       // %
  /** auto-derived */
  line_subtotal?: number; // qty * rate
  tax_amount?: number;    // line_subtotal * tax/100
  line_total?: number;
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
}

export function recalcLine(l: DocLine): DocLine {
  const subtotal = (l.qty || 0) * (l.rate || 0);
  const tax = subtotal * (l.tax_rate || 0) / 100;
  return { ...l, line_subtotal: subtotal, tax_amount: tax, line_total: subtotal + tax };
}

export type DocTaxType = 'cgst_sgst' | 'igst' | 'none';

export function totalsOf(lines: DocLine[], taxType: DocTaxType = 'cgst_sgst') {
  const sub = lines.reduce((s, l) => s + (l.line_subtotal ?? 0), 0);
  const tax = lines.reduce((s, l) => s + (l.tax_amount ?? 0), 0);
  const cgst = taxType === 'cgst_sgst' ? Math.round((tax / 2) * 100) / 100 : 0;
  const sgst = cgst;
  const igst = taxType === 'igst' ? Math.round(tax * 100) / 100 : 0;
  return { subtotal: sub, tax_amount: tax, cgst, sgst, igst, total: sub + tax };
}

interface ProductRaw {
  code?: string | null;
  name?: string | null;
  hsn_code?: string | null;
  standard_cost?: number;
  standard_price?: number;
  tax_rate?: number;
}

interface Props {
  lines: DocLine[];
  onChange: (lines: DocLine[]) => void;
  readOnly?: boolean;
  showBatch?: boolean;          // for GRN/Invoice that ship stock
  showShipper?: boolean;        // for Export Invoice — packages per line
  hideTax?: boolean;            // for Export Invoice — hide Tax % column + tax summary
  productTypeFilter?: string;   // 'raw' | 'finished' | etc.
  taxType?: DocTaxType;         // 'cgst_sgst' (default) | 'igst' | 'none' — controls summary breakdown
  currency?: string;            // for display in totals (e.g. 'USD', 'INR')
}

export default function DocumentLineEditor({ lines, onChange, readOnly = false, showBatch = false, showShipper = false, hideTax = false, productTypeFilter, taxType = 'cgst_sgst', currency }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createForRow, setCreateForRow] = useState<string | null>(null);

  const addLine = () => onChange([...lines, recalcLine({ key: `new-${Date.now()}-${Math.random()}`, qty: 1, rate: 0, tax_rate: 0 })]);
  const update = (key: string, patch: Partial<DocLine>) =>
    onChange(lines.map((l) => l.key === key ? recalcLine({ ...l, ...patch }) : l));
  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key));

  const productFetcher = async (q: string, offset: number, limit: number): Promise<SmartDropdownItem<ProductRaw>[]> => {
    const list = await productApi.lookup(q, productTypeFilter, undefined, limit, offset);
    return list.map((p) => ({
      value: Number(p.id),
      label: `${p.code} — ${p.name}`,
      raw: {
        code: p.code,
        name: p.name,
        hsn_code: (p as { hsn_code?: string | null }).hsn_code ?? '',
        standard_cost: Number((p as { standard_cost?: number }).standard_cost ?? 0),
        standard_price: Number((p as { standard_price?: number }).standard_price ?? 0),
        tax_rate: Number((p as { tax_rate?: number }).tax_rate ?? 0),
      },
    }));
  };

  const applyPick = (rowKey: string, item: SmartDropdownItem<ProductRaw> | undefined, valueId: number | undefined) => {
    if (valueId == null || !item) { update(rowKey, { product_id: undefined, product_code: undefined, product_name: undefined }); return; }
    const row = lines.find((l) => l.key === rowKey);
    update(rowKey, {
      product_id: valueId,
      product_code: item.raw.code ?? '',
      product_name: item.raw.name ?? '',
      hsn_code: row?.hsn_code || (item.raw.hsn_code ?? ''),
      rate: row?.rate || (productTypeFilter === 'raw' ? (item.raw.standard_cost ?? 0) : (item.raw.standard_price ?? 0)),
      tax_rate: row?.tax_rate || (item.raw.tax_rate ?? 0),
    });
  };

  const onProductCreated = (created: Product) => {
    if (createForRow) {
      const row = lines.find((l) => l.key === createForRow);
      update(createForRow, {
        product_id: created.id,
        product_code: created.code,
        product_name: created.name,
        hsn_code: row?.hsn_code || (created.hsn_code ?? ''),
        rate: row?.rate || (productTypeFilter === 'raw' ? created.standard_cost : created.standard_price),
        tax_rate: row?.tax_rate || created.tax_rate,
      });
    }
    setCreateOpen(false);
    setCreateForRow(null);
  };

  const cols = [
    {
      title: 'Product', key: 'product',
      render: (_: unknown, row: DocLine) => (
        <SmartDropdown<ProductRaw>
          value={row.product_id}
          onChange={(v, item) => applyPick(row.key, item, v)}
          fetcher={productFetcher}
          placeholder="Search product..."
          fallbackLabel={row.product_code ? `${row.product_code} — ${row.product_name ?? ''}` : undefined}
          disabled={readOnly}
          style={{ width: 320 }}
          onAddNew={() => { setCreateForRow(row.key); setCreateOpen(true); }}
          addNewLabel="+ Add new product"
        />
      ),
    },
    { title: 'HSN/SAC', key: 'hsn', width: 110, render: (_: unknown, row: DocLine) => (
      <Input disabled={readOnly} value={row.hsn_code} placeholder="e.g. 3004" maxLength={16}
        onChange={(e) => update(row.key, { hsn_code: e.target.value })} />
    )},
    { title: 'Qty', key: 'qty', width: 100, render: (_: unknown, row: DocLine) => (
      <InputNumber disabled={readOnly} min={0} step={0.001} value={row.qty} onChange={(v) => update(row.key, { qty: Number(v ?? 0) })} style={{ width: '100%' }} />
    )},
    ...(showShipper ? [
      { title: 'Shipper qty', key: 'sq', width: 100, render: (_: unknown, row: DocLine) => (
        <InputNumber disabled={readOnly} min={0} step={1} value={row.shipper_qty} placeholder="pkgs" onChange={(v) => update(row.key, { shipper_qty: v == null ? undefined : Number(v) })} style={{ width: '100%' }} />
      )},
      { title: 'Shipper unit', key: 'su', width: 110, render: (_: unknown, row: DocLine) => (
        <Input disabled={readOnly} value={row.shipper_unit} placeholder="BOX" maxLength={32} onChange={(e) => update(row.key, { shipper_unit: e.target.value })} />
      )},
    ] : []),
    { title: 'Rate', key: 'rate', width: 110, render: (_: unknown, row: DocLine) => (
      <InputNumber disabled={readOnly} min={0} step={0.01} value={row.rate} onChange={(v) => update(row.key, { rate: Number(v ?? 0) })} style={{ width: '100%' }} />
    )},
    ...(hideTax ? [] : [
      { title: 'Tax %', key: 'tax_rate', width: 90, render: (_: unknown, row: DocLine) => (
        <InputNumber disabled={readOnly} min={0} max={100} step={0.5} value={row.tax_rate} onChange={(v) => update(row.key, { tax_rate: Number(v ?? 0) })} style={{ width: '100%' }} />
      )},
    ]),
    { title: 'Subtotal', key: 'subtotal', width: 110, align: 'right' as const,
      render: (_: unknown, row: DocLine) => (row.line_subtotal ?? 0).toFixed(2) },
    ...(hideTax ? [] : [
      { title: 'Tax', key: 'tax', width: 100, align: 'right' as const,
        render: (_: unknown, row: DocLine) => (row.tax_amount ?? 0).toFixed(2) },
    ]),
    { title: 'Total', key: 'total', width: 120, align: 'right' as const,
      render: (_: unknown, row: DocLine) => <strong>{(row.line_total ?? 0).toFixed(2)}</strong> },
    ...(showBatch ? [
      { title: 'Batch', key: 'batch', width: 140, render: (_: unknown, row: DocLine) => (
        <Input disabled={readOnly} value={row.batch_no} onChange={(e) => update(row.key, { batch_no: e.target.value })} />
      )},
    ] : []),
    { title: '', key: 'rm', width: 50, render: (_: unknown, row: DocLine) => (
      <Button size="small" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => remove(row.key)} />
    )},
  ];

  const t = totalsOf(lines, taxType);
  const ccy = currency ?? '';

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text strong>Lines</Typography.Text>
        {!readOnly && <Button icon={<PlusOutlined />} onClick={addLine}>Add product</Button>}
      </Space>
      <Table<DocLine> rowKey="key" dataSource={lines} columns={cols} pagination={false} size="small"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5 + (showShipper ? 2 : 0) - (hideTax ? 1 : 0)}><strong>Totals</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><strong>{t.subtotal.toFixed(2)}</strong></Table.Summary.Cell>
              {!hideTax && <Table.Summary.Cell index={2} align="right"><strong>{t.tax_amount.toFixed(2)}</strong></Table.Summary.Cell>}
              <Table.Summary.Cell index={3} align="right"><strong>{t.total.toFixed(2)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={showBatch ? 2 : 1}></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
      <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
        <Typography.Text type="secondary">Subtotal: <strong>{ccy} {t.subtotal.toFixed(2)}</strong></Typography.Text>
        {!hideTax && taxType === 'cgst_sgst' && <>
          <Typography.Text type="secondary">CGST: <strong>{t.cgst.toFixed(2)}</strong></Typography.Text>
          <Typography.Text type="secondary">SGST: <strong>{t.sgst.toFixed(2)}</strong></Typography.Text>
        </>}
        {!hideTax && taxType === 'igst' && <Typography.Text type="secondary">IGST: <strong>{t.igst.toFixed(2)}</strong></Typography.Text>}
        {!hideTax && taxType === 'none' && <Typography.Text type="secondary">Tax: <strong>0.00</strong> (out of scope / LUT export)</Typography.Text>}
        <Typography.Text>Total: <strong style={{ fontSize: 16 }}>{ccy} {t.total.toFixed(2)}</strong></Typography.Text>
      </Space>

      <InlineCreateProductModal
        open={createOpen}
        onCancel={() => { setCreateOpen(false); setCreateForRow(null); }}
        onCreated={onProductCreated}
        defaultType={(productTypeFilter as ProductType | undefined) ?? 'finished'}
        lockType={Boolean(productTypeFilter)}
      />
    </Space>
  );
}
