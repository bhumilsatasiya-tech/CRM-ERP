import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { stockLedgerApi } from '../api/inventoryApi';
import { productApi } from '../../05-products/api/productsApi';
import type { MovementType, StockLedgerRow } from '../types/inventory.types';

const TYPE_COLORS: Record<MovementType, string> = {
  opening: 'default', in: 'green', out: 'red',
  transfer_in: 'cyan', transfer_out: 'orange', adjustment: 'purple',
};

export default function StockLedgerPage() {
  const [rows, setRows] = useState<StockLedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState<MovementType | undefined>(undefined);
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [productOpts, setProductOpts] = useState<Array<{ value: number; label: string }>>([]);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await stockLedgerApi.list({
        page, per_page: perPage,
        product_id: productId,
        movement_type: movementType,
        reference_no: search || undefined,
        from: range?.[0]?.format('YYYY-MM-DD'),
        to:   range?.[1]?.format('YYYY-MM-DD'),
      });
      setRows(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed to load ledger.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [page, perPage, movementType, productId, range]);

  const onSearchProduct = async (q: string) => {
    if (!q) { setProductOpts([]); return; }
    try {
      const list = await productApi.lookup(q, undefined, undefined, 20);
      setProductOpts(list.map((p) => ({ value: Number(p.id), label: `${p.code} — ${p.name}` })));
    } catch { /* ignore */ }
  };

  const columns: ColumnsType<StockLedgerRow> = [
    { title: 'Posted', dataIndex: 'posted_at', key: 'posted_at', width: 160,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
    { title: 'Type', dataIndex: 'movement_type', key: 'movement_type', width: 130,
      render: (t: MovementType, row) => (
        <Space>
          <Tag color={TYPE_COLORS[t]}>{t}</Tag>
          {row.is_reversal && <Tag color="red">reversal</Tag>}
          {row.is_reversed && <Tag color="default">reversed</Tag>}
        </Space>
      ),
    },
    { title: 'Reference', dataIndex: 'reference_no', key: 'ref' },
    { title: 'Product', key: 'product',
      render: (_, row) => row.product ? (
        <Space direction="vertical" size={0}>
          <strong>{row.product.code}</strong>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.product.name}</Typography.Text>
        </Space>
      ) : `#${row.product_id}` },
    { title: 'Warehouse', key: 'wh', render: (_, row) => row.warehouse?.code ?? `#${row.warehouse_id}` },
    { title: 'Batch', dataIndex: 'batch_no', key: 'batch' },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'right' as const, width: 110,
      render: (v: number) => (
        <Typography.Text strong style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
          {v >= 0 ? '+' : ''}{v.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </Typography.Text>
      ),
    },
    { title: 'Balance', dataIndex: 'balance_qty', key: 'balance', align: 'right' as const, width: 110,
      render: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', align: 'right' as const, width: 100 },
    { title: 'Value', dataIndex: 'value', key: 'value', align: 'right' as const, width: 110,
      render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: perPage, total, showSizeChanger: true, pageSizeOptions: [25, 50, 100, 200],
    onChange: (p, ps) => { setPage(p); setPerPage(ps); },
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Stock ledger</Typography.Title>
          <Space wrap>
            <Input.Search placeholder="Search reference no" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetchData(); }} style={{ width: 220 }} />
            <Select
              showSearch placeholder="Filter by product" allowClear style={{ width: 280 }}
              value={productId} onChange={(v) => { setProductId(v); setPage(1); }}
              onSearch={onSearchProduct}
              filterOption={false}
              options={productOpts}
            />
            <Select
              placeholder="Movement type" allowClear style={{ width: 160 }}
              value={movementType} onChange={(v) => { setMovementType(v); setPage(1); }}
              options={[
                { value: 'in', label: 'Stock In' },
                { value: 'out', label: 'Stock Out' },
                { value: 'transfer_in', label: 'Transfer In' },
                { value: 'transfer_out', label: 'Transfer Out' },
                { value: 'adjustment', label: 'Adjustment' },
                { value: 'opening', label: 'Opening' },
              ]}
            />
            <DatePicker.RangePicker value={range as [Dayjs | null, Dayjs | null]} onChange={(v) => { setRange(v as [Dayjs | null, Dayjs | null]); setPage(1); }} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
          </Space>
        </Space>

        <Table<StockLedgerRow> rowKey="id" dataSource={rows} columns={columns} loading={loading} pagination={pagination} size="small" scroll={{ x: 1500 }} />
      </Space>
    </Card>
  );
}
